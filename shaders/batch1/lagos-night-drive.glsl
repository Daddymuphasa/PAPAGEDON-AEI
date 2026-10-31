// Lagos Night Drive (Batch 1): neon city lights streaking past, speed follows
// energy. Written from scratch for this repo; every color comes from
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
#define LANES 14
#elif AEI_QUALITY == 1
#define LANES 26
#else
#define LANES 44
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * u_speed;
  float beatClock = u_time * u_bpm / 60.0;
  float speed = 0.25 + 2.5 * u_energy + u_beat * 0.6;
  float horizon = 0.46;
  vec3 col = pal(0.03) * 0.25;
  float skyline = step(uv.y, horizon) * step(horizon - 0.16, uv.y);
  float blocks = step(0.55, hash21(vec2(floor(uv.x * 24.0), 3.0)));
  float winRow = step(0.6, hash21(vec2(floor(uv.x * 24.0), floor(uv.y * 60.0))));
  col += pal(0.5) * skyline * blocks * 0.35;
  col += pal(0.8) * skyline * blocks * winRow * (0.3 + 0.5 * u_mid);
  float road = smoothstep(horizon - 0.02, horizon + 0.06, uv.y);
  col = mix(col, pal(0.05) * 0.4, road);
  float lanesF = float(LANES);
  float lane = floor(uv.x * lanesF);
  float lh = hash21(vec2(lane, 7.0));
  float trail = fract(uv.y * (1.5 + u_p1) - t * speed * (0.5 + lh) + lh * 3.0);
  float dash = smoothstep(0.0, 0.12, trail) * (1.0 - smoothstep(0.12, 0.5, trail));
  float laneOn = step(0.35, lh);
  float laneX = abs(fract(uv.x * lanesF) - 0.5);
  float streak = (1.0 - smoothstep(0.02, 0.2, laneX)) * dash * laneOn;
  vec3 streakCol = mix(pal(0.35 + 0.4 * lh), pal(0.9), step(0.8, lh) * u_high);
  col += streakCol * streak * road * (0.5 + 0.9 * u_bass + 0.4 * u_p2);
  float centerDash = (1.0 - smoothstep(0.004, 0.012, abs(uv.x - 0.5))) * road;
  float centerFlow = step(0.5, fract(uv.y * 6.0 - beatClock * 2.0));
  col += pal(0.7) * centerDash * centerFlow * (0.5 + 0.5 * u_pulse) * u_p3;
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
