// Arcade Pixels (Batch 5): chunky pixel blocks that pop with u_energy.
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
#define PIXELS 28.0
#elif AEI_QUALITY == 1
#define PIXELS 48.0
#else
#define PIXELS 80.0
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float beatClock = u_time * u_bpm / 60.0;
  vec2 grid = vec2(PIXELS * ar.x * (0.7 + 0.3 * u_p1), PIXELS);
  vec2 id = floor(uv * grid);
  vec2 f = fract(uv * grid) - 0.5;
  float h = hash21(id);
  float step_ = floor(beatClock * 2.0);
  float pop = step(hash21(id + step_), 0.2 + 0.6 * u_energy);
  float glow = pop * (0.5 + 0.5 * u_beat);
  float inset = 0.5 - 0.06 - 0.1 * glow;
  float block = 1.0 - smoothstep(inset - 0.03, inset + 0.03, max(abs(f.x), abs(f.y)));
  vec3 col = pal(0.03) * 0.3;
  col += pal(0.15 + 0.55 * h) * block * (0.3 + 0.5 * u_mid + 0.6 * glow);
  col += pal(0.9) * block * glow * u_high * u_p2;
  float invader = step(abs(id.x - floor(grid.x * 0.5) - mod(step_, 9.0) + 4.0), 2.0);
  invader *= step(abs(id.y - grid.y * 0.72), 1.0);
  col = mix(col, pal(0.7), invader * block * 0.8 * u_p3);
  float scan = 0.5 + 0.5 * sin(uv.y * u_resolution.y * 1.2);
  col *= 1.0 - scan * 0.1;
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
