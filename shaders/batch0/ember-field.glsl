// Ember Field (Batch 0): fire embers rising over dark ground, gusts of
// sparks on beats. Written from scratch for this repo; every color
// comes from u_palette.
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
#define EMBERS 24
#elif AEI_QUALITY == 1
#define EMBERS 56
#else
#define EMBERS 110
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float beatClock = u_time * u_bpm / 60.0;
  vec3 col = pal(0.02) * 0.25;
  col += pal(0.12) * exp(-abs(uv.y - 0.08) * 6.0) * (0.3 + 0.7 * u_bass);
  float gust = 0.35 + 0.65 * u_beat;
  vec3 accCol = vec3(0.0);
  float sharp = mix(120.0, 40.0, u_p3);
  for (int i = 0; i < EMBERS; i++) {
    float fi = float(i);
    float h1 = fract(sin(fi * 12.9898) * 43758.5453);
    float h2 = fract(sin(fi * 78.233) * 12543.1234);
    float h3 = fract(sin(fi * 39.425) * 9876.5432);
    float speed = (0.12 + 0.25 * h2) * (0.7 + 0.6 * u_energy) * u_p1;
    float y = fract(h1 + t * speed + gust * 0.15 * sin(beatClock * 0.5 + h3 * 6.2831));
    float x = fract(h2 * 7.0 + sin(t * (0.4 + h3) + h1 * 40.0) * 0.03 + h3 * 0.2 * u_mid);
    vec2 ep = vec2(x, 0.05 + y * 0.9);
    float d = length((uv - ep) * ar);
    float tw = 0.6 + 0.4 * sin(t * (6.0 + 10.0 * h3) + h1 * 50.0);
    float m = exp(-d * sharp * (0.7 + 0.6 * h2)) * tw;
    float vis = step(h3, 0.25 + 0.75 * gust * (0.5 + 0.5 * u_high));
    accCol += pal(clamp(0.15 + y * 0.75 + h1 * 0.2, 0.0, 1.0)) * (m * vis * (0.6 + 0.8 * u_p2));
  }
  col += accCol;
  col += pal(0.3) * exp(-abs(uv.y - 0.3 - 0.1 * sin(t * 0.7)) * 8.0) * 0.15 * (u_bass + u_pulse * 0.5);
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
