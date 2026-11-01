// Rose Petal Fall (Batch 3): petals drifting down, gusts on beats. Written
// from scratch for this repo; every color comes from u_palette.
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
#define PETALS 14
#elif AEI_QUALITY == 1
#define PETALS 26
#else
#define PETALS 48
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float gust = u_beat * (0.7 + 0.6 * u_p1);
  vec3 col = mix(pal(0.02) * 0.3, pal(0.15) * 0.55, uv.y * (0.6 + 0.2 * u_energy));
  for (int i = 0; i < PETALS; i++) {
    float fi = float(i);
    float h1 = fract(sin(fi * 12.9898) * 43758.5453);
    float h2 = fract(sin(fi * 78.233) * 12543.1234);
    float h3 = fract(sin(fi * 39.425) * 9876.5432);
    float fall = fract(h1 + t * (0.04 + 0.06 * h2) * (1.0 + gust));
    float swayAmp = 0.05 + 0.1 * gust;
    vec2 pp = vec2(
      h2 * 0.95 + 0.025 + sin(t * (0.8 + h3) + h1 * 20.0 + fall * 9.0) * swayAmp,
      1.05 - fall * 1.15
    );
    float rot = h3 * 6.2831 + t * (1.0 + 2.0 * h1) + gust * 3.0 * h2;
    vec2 d = (uv - pp) * ar;
    float cs = cos(rot);
    float sn = sin(rot);
    vec2 rp = mat2(cs, -sn, sn, cs) * d;
    float petal = exp(-length(rp * vec2(20.0, 10.0)) * 1.6);
    float shade = 0.7 + 0.3 * sin(rot * 2.0 + h1 * 10.0);
    float near = smoothstep(1.1, 0.4, fall);
    col = mix(col, pal(0.3 + 0.45 * h3) * shade * (0.85 + 0.4 * u_mid), clamp(petal * (0.6 + 0.5 * near), 0.0, 0.92));
  }
  col += pal(0.85) * u_high * 0.06 * u_p2;
  col += pal(0.5) * exp(-length((uv - 0.5) * ar) * 2.0) * 0.12 * (0.5 + 0.5 * u_bass) * u_p3;
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
