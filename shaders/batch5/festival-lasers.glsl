// Festival Lasers (Batch 5): wide crowd lasers fanning across the sky.
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

vec3 pal(float t) {
  float x = clamp(t, 0.0, 1.0) * 3.0;
  vec3 c1 = mix(u_palette[0], u_palette[1], clamp(x, 0.0, 1.0));
  vec3 c2 = mix(u_palette[1], u_palette[2], clamp(x - 1.0, 0.0, 1.0));
  vec3 c3 = mix(u_palette[2], u_palette[3], clamp(x - 2.0, 0.0, 1.0));
  if (x < 1.0) return c1;
  if (x < 2.0) return c2;
  return c3;
}

#if AEI_QUALITY == 0
#define FANS 4
#elif AEI_QUALITY == 1
#define FANS 7
#else
#define FANS 11
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  vec3 col = pal(0.02) * 0.28;
  col += pal(0.1) * exp(-uv.y * 2.0) * 0.25;
  float crowdLine = 0.2 + 0.02 * sin(uv.x * 30.0 + t * 3.0) * (0.4 + u_bass);
  float crowd = 1.0 - smoothstep(crowdLine - 0.01, crowdLine + 0.03, uv.y);
  for (int i = 0; i < FANS; i++) {
    float fi = float(i);
    float side = mod(fi, 2.0) * 2.0 - 1.0;
    vec2 src = vec2(0.5 + side * 0.32, 0.2);
    float fan = (fi - float(FANS - 1) * 0.5) / float(FANS);
    float aim = fan * (1.4 + 0.4 * u_energy) + sin(t * (0.8 + fi * 0.13) + fi * 2.0) * 0.25;
    vec2 dir = normalize(vec2(aim - side * 0.2, 1.0));
    vec2 rel = (uv - src) * ar;
    float along = dot(rel, dir);
    float across = abs(dot(rel, vec2(-dir.y, dir.x)));
    float beam = exp(-across * 42.0) * step(0.0, along) * exp(-along * 0.9);
    float gate = 0.3 + 0.7 * (0.5 + 0.5 * sin(t * 3.0 + fi * 4.4 + u_beat * 4.0));
    col += pal(0.35 + 0.45 * (fi / float(FANS))) * beam * gate * (0.6 + 0.9 * u_beat) * (0.6 + 0.4 * u_p1);
  }
  col = mix(col, pal(0.03) * 0.3, crowd * 0.85);
  col += pal(0.8) * exp(-length((uv - vec2(0.5, 0.2)) * ar) * 3.0) * u_beat * u_p2;
  col += pal(0.9) * (1.0 - crowd) * u_high * 0.1 * u_p3;
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
