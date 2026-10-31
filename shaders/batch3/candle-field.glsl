// Candle Field (Batch 3): hundreds of soft candle lights flickering to the
// music. Written from scratch for this repo; every color comes from
// u_palette.
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

#if AEI_QUALITY == 0
#define CANDLES 9.0
#elif AEI_QUALITY == 1
#define CANDLES 15.0
#else
#define CANDLES 22.0
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  vec2 grid = vec2(CANDLES * ar.x * (0.7 + 0.3 * u_p1), CANDLES);
  vec2 cell = fract(uv * grid) - 0.5;
  vec2 id = floor(uv * grid);
  float h1 = hash21(id);
  float h2 = hash21(id + 13.0);
  float flick = 0.7 + 0.3 * sin(t * (6.0 + 6.0 * h1) + h2 * 40.0);
  flick *= 0.75 + 0.25 * sin(t * 17.0 + h1 * 20.0 + u_high * 4.0);
  flick *= 0.8 + 0.4 * u_beat;
  float sway = sin(t * 2.0 + h1 * 6.2831) * 0.08 * (0.5 + u_mid);
  vec2 fp = vec2(cell.x + sway, cell.y * (1.0 + 0.3 * h2));
  float flame = exp(-length(fp * vec2(6.0, 3.2)) * 2.2);
  float halo = exp(-length(cell) * 3.5);
  float on = step(h1, 0.55 + 0.45 * u_energy);
  vec3 col = pal(0.02) * 0.25;
  col += pal(0.5 + 0.2 * h2) * halo * on * flick * 0.5 * u_p2;
  col += pal(0.8) * flame * on * flick;
  col += pal(0.95) * flame * flame * on * (0.5 + 0.5 * u_high) * u_p3;
  float wax = (1.0 - smoothstep(0.0, 0.12, abs(cell.x + sway))) * step(cell.y, -0.1) * step(-0.45, cell.y);
  col += pal(0.7) * wax * on * 0.25 * (0.5 + 0.5 * u_bass);
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
