// Liquid Mirror (Batch 0): chrome liquid surface reflecting the palette,
// waves rising with bass, ripples on every kick. Written from scratch
// for this repo; every color comes from u_palette.
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

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float beatClock = u_time * u_bpm / 60.0;
  float amp = 0.15 + 0.85 * u_bass;
  vec2 w = uv * ar * (3.0 + 2.0 * u_p1);
  float w1 = vnoise(w * 2.0 + vec2(t * 0.4, t * 0.23));
  float w2 = vnoise(w * 3.7 - vec2(t * 0.31, t * 0.42) + w1);
  float waves = w1 * 0.65 + w2 * 0.35;
#if AEI_QUALITY > 0
  waves = waves * 0.75 + 0.25 * vnoise(w * 7.3 + vec2(-t * 0.5, t * 0.36) + w2 * 2.0);
#endif
  float r = length((uv - vec2(0.5, 0.75)) * ar);
  float rip = sin(r * 34.0 - u_beat * 9.0) * 0.5 + 0.5;
  rip *= exp(-r * 3.0) * (0.25 + 0.75 * u_beat) * (0.5 + u_p3);
  vec2 grad = vec2(
    vnoise(w * 2.0 + vec2(0.35, 0.0) + t * 0.1) - w1,
    vnoise(w * 2.0 + vec2(0.0, 0.35) - t * 0.13) - w1
  );
  vec2 refl = uv + grad * amp * 0.35 * u_p2 + vec2(0.0, rip * 0.02);
  float chrome = clamp(waves * (0.7 + 0.6 * u_mid) + rip * 0.5 + u_high * 0.15 * vnoise(uv * 90.0), 0.0, 1.0);
  vec3 col = pal(chrome);
  col *= 0.55 + 0.45 * vnoise(refl * 5.0 + t * 0.2);
  float crest = smoothstep(0.75 - 0.3 * u_energy, 1.0, waves + rip * 0.4) * (0.4 + 0.6 * u_pulse);
  col += pal(0.9) * crest * (0.5 + u_beat);
  col *= 0.9 + 0.1 * sin(beatClock * 6.2831);
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
