// Bass Portal (Batch 0): circular portal ring breathing with the bass,
// kick shockwaves, warp at drops. Written from scratch for this repo;
// every color comes from u_palette.
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
  float ringR = 0.32 * u_p1 + u_bass * 0.14;
  float ring = exp(-abs(r - ringR) * 22.0);
  float phase = fract(beatClock);
  float w1 = exp(-abs(r - phase * 0.9) * 30.0) * (1.0 - phase);
  float w2 = exp(-abs(r - fract(phase + 0.5) * 0.9) * 30.0) * (1.0 - fract(phase + 0.5));
  float shock = (w1 + w2) * (0.3 + 0.7 * u_beat) * (0.5 + u_p2);
#if AEI_QUALITY > 1
  float w3 = exp(-abs(r - fract(phase + 0.25) * 0.9) * 34.0) * (1.0 - fract(phase + 0.25));
  float w4 = exp(-abs(r - fract(phase + 0.75) * 0.9) * 34.0) * (1.0 - fract(phase + 0.75));
  shock += (w3 + w4) * 0.3 * (0.3 + 0.7 * u_beat);
#endif
  float warp = u_energy * u_energy * (1.5 + u_p3 * 2.0);
  float tw = ang + warp * exp(-r * 4.0) + t * (0.2 + 0.6 * u_energy);
  float rays = 0.5 + 0.5 * sin(tw * 12.0 + r * 20.0 - t * 2.0);
  rays = pow(rays, 3.0) * exp(-r * 2.5);
  float core = exp(-r * (5.0 - 2.5 * u_energy)) * (0.5 + 1.8 * u_beat + u_pulse);
  float coreTex = 0.5 + 0.5 * sin(tw * 24.0) * sin(r * 40.0 - t * 3.0);
  vec3 col = pal(clamp(0.04 + r * 0.3, 0.0, 1.0)) * 0.3;
  col += pal(clamp(0.4 + r * 0.3 + u_mid * 0.2, 0.0, 1.0)) * ring * (0.6 + 1.4 * u_bass);
  col += pal(clamp(0.6 + phase * 0.2, 0.0, 1.0)) * shock;
  col += pal(clamp(0.5 + coreTex * 0.3, 0.0, 1.0)) * rays * (0.4 + 0.6 * u_mid);
  col += pal(0.85) * core * (1.0 + coreTex * u_high);
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
