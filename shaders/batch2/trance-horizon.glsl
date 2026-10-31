// Trance Horizon (Batch 2): endless glowing horizon grid with euphoric
// light bloom on drops. Written from scratch for this repo; every color
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

vec3 pal(float t) {
  float x = clamp(t, 0.0, 1.0) * 3.0;
  vec3 c1 = mix(u_palette[0], u_palette[1], clamp(x, 0.0, 1.0));
  vec3 c2 = mix(u_palette[1], u_palette[2], clamp(x - 1.0, 0.0, 1.0));
  vec3 c3 = mix(u_palette[2], u_palette[3], clamp(x - 2.0, 0.0, 1.0));
  if (x < 1.0) return c1;
  if (x < 2.0) return c2;
  return c3;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float horizon = 0.52;
  vec3 col = mix(pal(0.02), pal(0.2 + 0.2 * u_energy), smoothstep(1.0, horizon, uv.y));
  vec2 sunP = vec2(0.5, horizon + 0.12);
  float sd = length((uv - sunP) * ar);
  float drop = clamp(u_pulse + u_beat * 0.5, 0.0, 1.5);
  col += pal(0.55) * exp(-sd * (5.0 - 2.5 * min(drop, 1.0))) * (0.5 + drop);
  col += pal(0.85) * exp(-sd * 14.0) * (0.4 + drop * 1.2) * u_p1;
  float below = smoothstep(horizon + 0.004, horizon - 0.02, uv.y);
  float depth = 1.0 / max(uv.y - horizon + 0.12, 0.02);
  vec2 gp = vec2((uv.x - 0.5) * depth, depth * 0.4 - t * (1.0 + 3.0 * u_energy));
  float gx = abs(fract(gp.x * 2.0) - 0.5);
  float gz = abs(fract(gp.y * 2.0) - 0.5);
  float grid = 1.0 - smoothstep(0.0, 0.08, min(gx, gz));
  float fade = exp(-depth * 0.25);
  col = mix(col, pal(0.04) * 0.5, below);
  col += pal(0.4 + 0.2 * u_mid) * grid * below * fade * (0.5 + 0.8 * u_bass);
#if AEI_QUALITY > 0
  float gx2 = abs(fract(gp.x * 8.0) - 0.5);
  float gz2 = abs(fract(gp.y * 8.0) - 0.5);
  float grid2 = 1.0 - smoothstep(0.0, 0.1, min(gx2, gz2));
  col += pal(0.7) * grid2 * below * fade * 0.3 * u_p2;
#endif
#if AEI_QUALITY > 1
  col += pal(0.95) * exp(-sd * 30.0) * u_high * u_p3;
#endif
  float scan = 0.5 + 0.5 * sin(uv.y * u_resolution.y * 1.5);
  col *= 1.0 - scan * 0.06 * u_high;
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
