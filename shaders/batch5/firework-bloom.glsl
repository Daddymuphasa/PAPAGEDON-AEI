// Firework Bloom (Batch 5): fireworks bursting at peaks. Rocket loop
// capped by quality (4/8/14). Written from scratch for this repo; every
// color comes from u_palette.
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
#define ROCKETS 4
#elif AEI_QUALITY == 1
#define ROCKETS 8
#else
#define ROCKETS 14
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float peak = clamp(u_energy * 0.7 + u_beat * 0.5 + u_pulse * 0.4, 0.0, 1.4);
  vec3 col = pal(0.02) * 0.28;
  for (int i = 0; i < ROCKETS; i++) {
    float fi = float(i);
    float h1 = fract(sin(fi * 12.9898) * 43758.5453);
    float h2 = fract(sin(fi * 78.233) * 12543.1234);
    float h3 = fract(sin(fi * 39.425) * 9876.5432);
    float cyc = fract(h1 + t * (0.12 + 0.15 * h2) * (0.4 + min(peak, 1.0)));
    vec2 ap = vec2(0.1 + 0.8 * h2, 0.35 + 0.45 * h3);
    float rise = smoothstep(0.0, 0.35, cyc);
    float boom = smoothstep(0.35, 0.45, cyc) * (1.0 - smoothstep(0.45, 1.0, cyc));
    vec2 rp = vec2(ap.x, mix(0.05, ap.y, rise));
    float trail = exp(-abs(uv.x - rp.x) * 90.0) * step(uv.y, rp.y) * step(rp.y - 0.25, uv.y) * (1.0 - rise);
    col += pal(0.6 + 0.2 * h1) * trail * 0.8;
    vec2 bd = (uv - ap) * ar;
    float br = length(bd);
    float ba = atan(bd.y, bd.x);
    float rays = 0.5 + 0.5 * sin(ba * (10.0 + 10.0 * h1) + h2 * 20.0);
    float shell = exp(-abs(br - boom * 0.3 * (0.6 + u_p1)) * 22.0) * boom;
    col += pal(h3) * shell * (0.5 + 0.5 * rays) * (0.5 + min(peak, 1.0));
    col += pal(0.95) * exp(-br * 30.0) * boom * u_high * u_p2;
  }
  col += pal(0.75) * min(peak, 1.0) * 0.12 * u_p3;
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
