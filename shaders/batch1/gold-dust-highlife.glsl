// Gold Dust Highlife (Batch 1): warm gold particles swirling like dancing
// cloth. Written from scratch for this repo; every color comes from
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
#define MOTES 26
#elif AEI_QUALITY == 1
#define MOTES 52
#else
#define MOTES 96
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float beatClock = u_time * u_bpm / 60.0;
  vec3 col = pal(0.03) * 0.3;
  col += pal(0.12) * exp(-length((uv - 0.5) * ar) * 2.5) * (0.4 + 0.6 * u_bass);
  float swirl = 0.5 + u_energy * 1.5;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < MOTES; i++) {
    float fi = float(i);
    float h1 = fract(sin(fi * 12.9898) * 43758.5453);
    float h2 = fract(sin(fi * 78.233) * 12543.1234);
    float h3 = fract(sin(fi * 39.425) * 9876.5432);
    float rr = 0.08 + 0.42 * h1 + u_beat * 0.08 * h3;
    float ang = h2 * 6.2831 + t * (0.2 + 0.6 * h3) * swirl + beatClock * 0.2 * h1;
    vec2 mp = vec2(0.5, 0.5) + vec2(cos(ang), sin(ang)) * rr / ar * ar.x / max(ar.x, 1.0);
    mp.y += sin(mp.x * 5.0 + t * 2.0 + h1 * 6.2831) * 0.045 * u_p1;
    float d = length((uv - mp) * ar);
    float tw = 0.5 + 0.5 * sin(t * (4.0 + 8.0 * h2) + h3 * 40.0 + u_high * 5.0);
    float m = exp(-d * (60.0 + 60.0 * h2) * (0.6 + 0.4 * u_p2)) * tw;
    acc += pal(clamp(0.5 + 0.3 * h2 + 0.1 * u_energy, 0.0, 1.0)) * m;
  }
  col += acc * (0.7 + 0.6 * u_mid);
  col += pal(0.85) * exp(-length((uv - 0.5) * ar) * 6.0) * u_beat * u_p3;
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
