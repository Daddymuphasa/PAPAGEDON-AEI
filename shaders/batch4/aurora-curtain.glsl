// Aurora Curtain (Batch 4): flowing aurora ribbons, sway speed from u_mid.
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
#define CURTAINS 2
#elif AEI_QUALITY == 1
#define CURTAINS 3
#else
#define CURTAINS 5
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * u_speed;
  float swaySpeed = 0.5 + 2.5 * u_mid;
  vec3 col = pal(0.02) * 0.25;
  col += pal(0.08) * exp(-uv.y * 3.0) * 0.3;
  for (int i = 0; i < CURTAINS; i++) {
    float fi = float(i);
    float band = (fi + 0.5) / float(CURTAINS);
    float wave = sin(uv.x * (4.0 + fi * 2.0) + t * swaySpeed + fi * 2.4);
    wave += 0.5 * sin(uv.x * 11.0 - t * swaySpeed * 1.7 + u_energy * 4.0);
    float yc = 0.35 + band * 0.35 + wave * 0.08 * (0.5 + u_p1);
    float d = abs(uv.y - yc);
    float curtain = exp(-d * (14.0 - 4.0 * fi / float(CURTAINS)));
    float rays = 0.5 + 0.5 * sin(uv.x * 40.0 + fi * 7.0 + t * 2.0);
    vec3 tint = pal(0.3 + 0.5 * band);
    col += tint * curtain * (0.35 + 0.5 * u_bass + 0.3 * u_beat) * (0.6 + 0.4 * rays);
    col += pal(0.85) * curtain * rays * u_high * 0.35 * u_p2;
  }
  col += pal(0.7) * exp(-abs(uv.y - 0.75) * 8.0) * 0.2 * (0.4 + 0.6 * u_mid) * u_p3;
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
