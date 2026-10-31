// Rainforest Canopy (Batch 4): layered leaf shadows with light flickering
// through. Written from scratch for this repo; every color comes from
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
#define LEAVES 2
#elif AEI_QUALITY == 1
#define LEAVES 3
#else
#define LEAVES 4
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * u_speed;
  float sway = t * (0.4 + u_bass * 0.8);
  float cover = 0.0;
  float scale = 7.0 * (0.8 + 0.2 * u_p1);
  for (int i = 0; i < LEAVES; i++) {
    float fi = float(i);
    vec2 lp = uv * scale + vec2(sway * (0.3 + fi * 0.25), fi * 3.7);
    vec2 id = floor(lp);
    vec2 f = fract(lp) - 0.5;
    float h = hash21(id + fi * 11.0);
    float leaf = 1.0 - smoothstep(0.1, 0.42, length(f * vec2(1.0 + h, 1.4 - h)));
    cover += leaf * (0.5 - fi * 0.08);
    scale *= 1.7;
  }
  cover = clamp(cover, 0.0, 1.0);
  vec3 col = mix(pal(0.75) * (0.5 + 0.5 * u_mid), pal(0.15), cover);
  float flicker = 0.5 + 0.5 * sin(t * 7.0 + uv.x * 20.0) * sin(t * 5.0 + uv.y * 17.0);
  col += pal(0.9) * (1.0 - cover) * flicker * (0.2 + 0.5 * u_beat) * u_p2;
  float drip = fract(uv.y * 3.0 + t * 0.2 + hash21(vec2(floor(uv.x * 20.0), 1.0)));
  col += pal(0.6) * smoothstep(0.9, 1.0, drip) * 0.15 * u_high * u_p3;
  col += pal(0.3) * 0.1 * (0.5 + 0.5 * u_bass);
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
  float aeiIn = step(u_perfBox.x, aeiSp.x) * step(aeiSp.y, aeiB1.y) * aeiHasBox;
  vec3 aeiGlow = (u_palette[0] + u_palette[1]) * 0.5;
  col += aeiGlow * (aeiEdge * 0.5 + aeiIn * aeiSeg.r * 0.35) * aeiSegMix;
  col *= 1.0 + aeiSeg.g * 0.35 * aeiSegMix;
  col *= 1.0 + clamp(u_motion, 0.0, 1.0) * aeiSegMix * 0.12 * (0.5 + 0.5 * sin(u_time * 6.0));
  gl_FragColor = vec4(col, 1.0);
}
