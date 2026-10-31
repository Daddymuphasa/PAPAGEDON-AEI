// Black Hole Lens (Batch 4): gravitational warp ring that pulses on bass.
// Written from scratch for this repo; every color comes from u_palette.
precision mediump float;

uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_beat;
uniform float u_energy;
uniform float u_bpm;
uniform float u_intensity;
uniform float u_speed;
uniform float u_pulse;
uniform float u_p1;
uniform float u_p2;
uniform float u_p3;
uniform vec2 u_resolution;
uniform vec3 u_palette[4];
uniform sampler2D u_eventTex;
uniform float u_texMix;
uniform sampler2D u_segMask;
uniform vec4 u_perfBox;
uniform float u_motion;
uniform float u_segMix;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p = p + dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 pal(float t) {
  float x = clamp(t, 0.0, 1.0) * 3.0;
  vec3 c1 = mix(u_palette[0], u_palette[1], clamp(x, 0.0, 1.0));
  vec3 c2 = mix(u_palette[1], u_palette[2], clamp(x - 1.0, 0.0, 1.0));
  vec3 c3 = mix(u_palette[2], u_palette[3], clamp(x - 2.0, 0.0, 1.0));
  if (x < 1.0) return c1;
  if (x < 2.0) return c2;
  return c3;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  vec2 c = (uv - 0.5) * ar;
  float r = max(length(c), 0.001);
  float a = atan(c.y, c.x);
  float mass = 0.16 + 0.05 * u_bass + 0.03 * u_beat;
  float warp = mass * mass / max(r, mass * 0.4);
  float lensR = r + warp * (0.7 + 0.3 * u_p1);
  float disk = exp(-abs(lensR - mass * 1.9) * 9.0);
  float spin = sin(a * 3.0 - t * (1.5 + 3.0 * u_energy) + lensR * 8.0) * 0.5 + 0.5;
  vec3 col = pal(0.02) * 0.22;
  col += pal(0.35 + 0.3 * spin) * disk * (0.5 + 0.9 * u_bass + 0.4 * u_mid);
  float shadow = 1.0 - smoothstep(mass * 0.85, mass * 1.05, r);
  col *= 1.0 - shadow * 0.92;
  col += pal(0.75) * exp(-abs(r - mass * 1.9) * 22.0) * (0.4 + 0.8 * u_beat) * u_p2;
  vec2 scell = floor(uv * vec2(110.0, 65.0));
  float star = step(0.986, hash21(scell));
  float bent = hash21(scell + floor(warp * 40.0));
  col += pal(0.9) * star * (0.4 + 0.6 * bent) * u_high * (1.0 - shadow) * u_p3;
#if AEI_QUALITY > 0
  float disk2 = exp(-abs(lensR - mass * 2.6) * 12.0);
  col += pal(0.55) * disk2 * 0.5 * (0.4 + 0.6 * u_mid);
#endif
#if AEI_QUALITY > 1
  float jet = exp(-abs(c.x) * 18.0) * exp(-abs(c.y) * 2.2) * step(mass, r);
  col += pal(0.85) * jet * u_beat * 0.7;
#endif
  col *= 0.35 + 0.65 * u_intensity;
  // Shared event-art layer: displaced sample over the shader look (no-op at mix 0).
  float aeiMix = clamp(u_texMix, 0.0, 1.0) * 0.85;
  vec3 aeiGuide = texture2D(u_eventTex, uv).rgb;
  vec2 aeiUv = clamp(uv + (aeiGuide.rg - 0.5) * 0.08 * aeiMix, 0.0, 1.0);
  vec3 aeiArt = texture2D(u_eventTex, aeiUv).rgb;
  col = mix(col, aeiArt * (0.35 + 0.65 * u_intensity), aeiMix);
  // Shared vision layer: performer glow + crowd boost + motion pulse (no-op at mix 0).
  float aeiSegMix = clamp(u_segMix, 0.0, 1.0);
  vec2 aeiSeg = texture2D(u_segMask, uv).rg;
  vec2 aeiSp = vec2(uv.x, 1.0 - uv.y);
  vec2 aeiB1 = u_perfBox.xy + u_perfBox.zw;
  float aeiHasBox = step(0.0001, u_perfBox.z * u_perfBox.w);
  vec2 aeiDb = max(max(u_perfBox.xy - aeiSp, aeiSp - aeiB1), vec2(0.0));
  float aeiEdge = (1.0 - smoothstep(0.0, 0.035, length(aeiDb))) * aeiHasBox;
  float aeiIn = step(u_perfBox.x, aeiSp.x) * step(aeiSp.x, aeiB1.x) * step(u_perfBox.y, aeiSp.y) * step(aeiSp.y, aeiB1.y) * aeiHasBox;
  vec3 aeiGlow = (u_palette[0] + u_palette[1]) * 0.5;
  col += aeiGlow * (aeiEdge * 0.5 + aeiIn * aeiSeg.r * 0.35) * aeiSegMix;
  col *= 1.0 + aeiSeg.g * 0.35 * aeiSegMix;
  col *= 1.0 + clamp(u_motion, 0.0, 1.0) * aeiSegMix * 0.12 * (0.5 + 0.5 * sin(u_time * 6.0));
  gl_FragColor = vec4(col, 1.0);
}
