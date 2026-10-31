// Nano Hex (Batch 0): hex micro-grid rippling outward from the bass,
// cells flipping and igniting on beats. Written from scratch for this
// repo; every color comes from u_palette.
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

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float beatClock = u_time * u_bpm / 60.0;
  vec2 p = (uv - 0.5) * ar * (6.0 + 10.0 * u_p1);
  vec2 s = vec2(1.0, 1.7320508);
  vec2 a = mod(p, s) - 0.5 * s;
  vec2 b = mod(p - 0.5 * s, s) - 0.5 * s;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  float d = length(g);
  vec2 cell = floor(p - g + 0.5);
  float h = hash21(cell);
  float r = length((uv - 0.5) * ar);
  float rip = sin(r * 14.0 - t * (2.0 + 6.0 * u_p2) - u_bass * 5.0) * 0.5 + 0.5;
#if AEI_QUALITY > 0
  rip += 0.5 * (sin(r * 27.0 - t * (3.0 + 4.0 * u_p2) + h * 6.2831) * 0.5 + 0.5);
  rip *= 0.6667;
#endif
#if AEI_QUALITY > 1
  rip = rip * 0.75 + 0.25 * (sin(r * 43.0 - t * 9.0 - u_mid * 6.0) * 0.5 + 0.5);
#endif
  float flip = step(0.5, fract(beatClock * 0.5 + h));
  float edgeW = mix(0.06, 0.02, u_beat);
  float edge = smoothstep(edgeW + 0.03, 0.0, abs(d - mix(0.42, 0.5, flip) * (0.75 + 0.25 * rip)));
  float lit = smoothstep(0.5, 0.15, d) * (0.15 + rip * (0.3 + 1.1 * u_bass));
  lit *= 0.4 + 0.9 * u_energy;
  lit += step(1.0 - 0.25 * u_beat, h) * (0.4 + 0.6 * u_beat);
  lit += step(0.985, h) * u_high * 0.9;
  vec3 col = vec3(0.0);
  col += pal(clamp(h * 0.7 + rip * 0.3 + u_mid * 0.2, 0.0, 1.0)) * lit * (0.5 + u_p3);
  col += pal(clamp(0.35 + u_bass * 0.5, 0.0, 1.0)) * edge * (0.25 + 0.75 * u_beat + 0.5 * u_pulse);
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
