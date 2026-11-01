// Confetti Burst (Batch 5): confetti explosions on drops. Particle loop
// capped by quality (16/30/56). Written from scratch for this repo;
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
#define BITS 16
#elif AEI_QUALITY == 1
#define BITS 30
#else
#define BITS 56
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float drop = clamp(u_pulse + u_beat * 0.6, 0.0, 1.4);
  vec3 col = pal(0.03) * 0.3;
  for (int i = 0; i < BITS; i++) {
    float fi = float(i);
    float h1 = fract(sin(fi * 12.9898) * 43758.5453);
    float h2 = fract(sin(fi * 78.233) * 12543.1234);
    float h3 = fract(sin(fi * 39.425) * 9876.5432);
    float cyc = fract(h1 + t * (0.12 + 0.25 * h2) * (0.6 + min(drop, 1.0)));
    float ang = h2 * 6.2831;
    float rad = cyc * (0.55 + 0.6 * min(drop, 1.0) * (0.5 + u_p1));
    vec2 bp = vec2(0.5, 0.45) + vec2(cos(ang), sin(ang)) * rad;
    bp.y -= cyc * cyc * 0.25;
    bp.x += sin(t * 3.0 + h3 * 20.0 + cyc * 8.0) * 0.03;
    float rot = h3 * 6.2831 + t * (2.0 + 4.0 * h1);
    vec2 d = (uv - bp) * ar;
    float cs = cos(rot);
    float sn = sin(rot);
    vec2 rp = mat2(cs, -sn, sn, cs) * d;
    float bit = exp(-length(rp * vec2(42.0, 22.0)) * 1.8);
    float fade = 1.0 - smoothstep(0.6, 1.0, cyc);
    col = mix(col, pal(h3) * (0.9 + 0.6 * u_mid), clamp(bit * fade, 0.0, 0.92));
  }
  col += pal(0.9) * exp(-length((uv - vec2(0.5, 0.45)) * ar) * 4.0) * min(drop, 1.0) * u_p2;
  vec2 rain = vec2(uv.x * 24.0 + sin(t * 0.8 + uv.y * 9.0) * 0.6, uv.y * 14.0 + t * (0.5 + u_energy));
  vec2 rc = floor(rain);
  vec2 rf = fract(rain) - 0.5;
  float rh = fract(sin(rc.x * 12.9898 + rc.y * 78.233) * 43758.5453);
  float rdot = (1.0 - smoothstep(0.04, 0.14, length(rf * vec2(1.0, 1.8)))) * step(0.55, rh);
  col += pal(rh) * rdot * (0.25 + 0.45 * u_mid) * (1.0 - min(drop, 1.0) * 0.5);
  col += pal(0.7) * u_high * 0.08 * u_p3;
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
