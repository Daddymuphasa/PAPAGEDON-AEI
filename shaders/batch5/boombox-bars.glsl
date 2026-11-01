// Boombox Bars (Batch 5): bold EQ bars driven by u_bass/u_mid/u_high.
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
#define BARS 12.0
#elif AEI_QUALITY == 1
#define BARS 24.0
#else
#define BARS 40.0
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * u_speed;
  float nb = BARS * (0.7 + 0.3 * u_p1);
  float col_ = floor(uv.x * nb);
  float fx = fract(uv.x * nb);
  float third = col_ / nb;
  float band = third < 0.34 ? u_bass : (third < 0.67 ? u_mid : u_high);
  float wob = 0.75 + 0.25 * sin(t * (4.0 + col_) + col_ * 2.39);
  float level = clamp(band * wob * 1.15, 0.03, 0.95);
  float y0 = 0.12;
  float bar = step(y0, uv.y) * (1.0 - smoothstep(level * 0.8, level * 0.8 + 0.015, uv.y - y0));
  float cap = 1.0 - smoothstep(0.0, 0.02, abs(uv.y - y0 - level * 0.8));
  float edge = 1.0 - smoothstep(0.06, 0.12, abs(fx - 0.5));
  vec3 col = pal(0.02) * 0.25;
  vec3 barCol = pal(0.2 + 0.6 * (uv.y - y0) + 0.15 * u_energy);
  col += barCol * bar * edge * (0.55 + 0.45 * u_beat + 0.3 * u_mid);
  col += pal(0.92) * cap * edge * (0.4 + 0.6 * u_high) * u_p2;
  float mirror = step(uv.y, y0) * step(y0 - 0.12, uv.y);
  col += barCol * mirror * edge * bar * 0.25;
  col += pal(0.5) * exp(-abs(uv.y - y0) * 30.0) * 0.4 * (0.4 + 0.6 * u_bass) * u_p3;
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
