// Hypno Spiral (Batch 2): hypnotic spiral speeding up with BPM. Written
// from scratch for this repo; every color comes from u_palette.
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
  float beatClock = u_time * u_bpm / 60.0;
  vec2 c = (uv - 0.5) * ar;
  float r = max(length(c), 0.001);
  float a = atan(c.y, c.x);
  float arms = 3.0 + floor(u_p1 * 4.0);
  float spin = beatClock * 3.14159 * (0.5 + u_energy) + t * 0.3;
  float spiral = sin(a * arms + log(r) * 6.0 + spin);
  float band = smoothstep(-0.3, 0.9, spiral);
  float breathe = 1.0 + 0.15 * u_bass * sin(t * 2.0);
  float tunnel = fract(log(r * breathe) * 1.5 + t * (0.5 + u_energy));
  float tunnelLine = 1.0 - smoothstep(0.0, 0.1, abs(tunnel - 0.5) - 0.4);
  vec3 col = mix(pal(0.03), pal(0.35 + 0.3 * u_energy), band);
  col += pal(0.65) * tunnelLine * (0.3 + 0.5 * u_mid);
  col += pal(0.9) * exp(-r * 7.0) * (0.4 + 0.8 * u_beat) * u_p2;
#if AEI_QUALITY > 0
  float fine = sin(a * arms * 3.0 + log(r) * 18.0 - spin * 2.0);
  col += pal(0.8) * smoothstep(0.9, 1.0, fine) * u_high * u_p3;
#endif
#if AEI_QUALITY > 1
  float glow2 = exp(-abs(r - 0.3 - 0.05 * sin(t)) * 12.0);
  col += pal(0.5) * glow2 * 0.4 * (0.5 + 0.5 * u_bass);
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
