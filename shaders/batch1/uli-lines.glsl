// Uli Lines (Batch 1): flowing hand-drawn Igbo uli-style line art that draws
// itself to the rhythm. Written from scratch for this repo; every color
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
  float beatClock = u_time * u_bpm / 60.0;
  vec2 w = uv * ar * (2.0 + u_p1 * 2.0);
  float warp = sin(w.y * 3.0 + t * 0.8) * 0.35;
  warp += sin((w.x + w.y) * 2.0 - t * 0.6 + u_energy * 2.0) * 0.25;
#if AEI_QUALITY > 0
  warp += sin(length(w - vec2(1.0, 0.5)) * 5.0 - t * 1.2) * 0.2;
#endif
#if AEI_QUALITY > 1
  warp += sin(w.x * 7.0 + w.y * 5.0 + t) * 0.1;
#endif
  float flow = sin((w.x + w.y * 0.6 + warp * (1.5 + u_mid)) * 9.0);
  float ink = smoothstep(0.86, 0.995, flow);
  float sweep = fract(beatClock * 0.25);
  float reveal = smoothstep(sweep + 0.1, sweep - 0.3, uv.x);
  vec3 col = pal(0.02) * 0.2;
  col += pal(0.3 + 0.4 * u_energy + 0.2 * uv.y) * ink * (0.25 + 0.75 * reveal) * (0.5 + 0.5 * u_beat + 0.3 * u_p2);
  float dots = smoothstep(0.994, 1.0, sin(w.x * 20.0) * sin(w.y * 20.0));
  col += pal(0.8) * dots * u_high * reveal * u_p3;
  col += pal(0.15) * (1.0 - reveal) * 0.12 * (0.4 + 0.6 * u_bass);
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
