// Particle Galaxy (Batch 0): spiral galaxy whose arms swirl faster with
// energy while the core flares on drops. Written from scratch for this
// repo; every color comes from u_palette.
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
  float beatClock = u_time * u_bpm / 60.0;
  vec2 c = (uv - 0.5) * ar;
  float r = length(c);
  float ang = atan(c.y, c.x);
  float swirl = t * (0.15 + 1.4 * u_energy) * u_p1;
  float spiral = 0.5 + 0.5 * sin(3.0 * ang - r * (6.0 + 4.0 * u_mid) + swirl * 3.0);
  spiral = pow(spiral, 1.5 + u_p2);
  float disc = exp(-r * (2.2 - 1.2 * u_energy));
  float downbeat = 0.75 + 0.5 * pow(0.5 + 0.5 * sin(beatClock * 6.2831), 2.0);
  float core = exp(-r * 9.0) * (0.6 + 2.2 * u_beat + 1.5 * u_pulse) * downbeat;
  vec2 sp = c * (40.0 + 30.0 * u_p3);
  vec2 cell = floor(sp);
  float h = hash21(cell);
  vec2 fpos = fract(sp) - 0.5;
  float star = smoothstep(0.28, 0.0, length(fpos)) * step(0.82, h) * (0.3 + 0.7 * fract(h * 7.0 + t * 2.0));
  star *= u_high * disc;
  float glow = spiral * disc * (0.25 + 1.3 * u_energy + 0.8 * u_bass);
  vec3 col = vec3(0.0);
  col += pal(clamp(0.55 - r * 0.9 + u_energy * 0.2, 0.0, 1.0)) * glow;
  col += pal(0.85) * core;
  col += pal(fract(h * 3.0)) * star * 2.0;
#if AEI_QUALITY > 0
  float dust = 0.5 + 0.5 * sin(6.0 * ang + r * 22.0 - swirl * 2.0 + sin(r * 30.0 + t) * 0.8);
  col += pal(clamp(0.2 + r * 0.4, 0.0, 1.0)) * dust * dust * disc * 0.35 * (0.3 + u_mid);
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
