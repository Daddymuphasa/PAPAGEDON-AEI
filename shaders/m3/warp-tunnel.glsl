// Warp Tunnel (M3): a flight tunnel warping with bass, paced by BPM.
// New code written for this repo.
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
uniform sampler2D u_eventTex; // M7 event artwork (unit 2, may be unbound)
uniform float u_texMix; // M7 artwork blend 0-1
uniform sampler2D u_segMask; // M8 segmentation (unit 3, may be unbound)
uniform vec4 u_perfBox; // M8 performer box xywh, normalized, y=0 top
uniform float u_motion; // crowd motion 0-1 (M8 SAM; renamed in M9-B)
uniform float u_segMix; // M8 mask strength 0-1

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
  vec2 q = (uv - 0.5) * 2.0;
  q.x = q.x * u_resolution.x / u_resolution.y;
  float r = length(q);
  float a = atan(q.y, q.x);
  float twist = a + u_p1 * 0.8 / max(r, 0.2) + u_time * 0.12 * u_speed;
  float depth = 1.0 / max(r - u_bass * 0.1 * u_p3, 0.12);
  float flow = u_time * (0.5 + u_bpm / 90.0) * u_speed * (0.6 + 0.8 * u_energy);
  float rings = sin(depth * 5.0 * max(u_p2, 0.1) - flow * 4.0);
  float stripes = sin(twist * 9.0 + depth * 1.5);
  float warp = sin(a * 3.0 + u_time * 0.8 * u_speed) * u_bass * u_p3 * 0.25;
  float body = 0.5 + rings * 0.3 + stripes * 0.2 + warp;
  float shade = clamp(1.3 - r * 0.9, 0.0, 1.0);
  float glow = smoothstep(0.5, 0.0, r) * (0.4 + u_pulse * 0.8 + u_mid * 0.2);
  vec3 col = vec3(0.006, 0.007, 0.012);
  col = col + pal(clamp(body * 0.5 + depth * 0.03 + u_energy * 0.2, 0.0, 1.0)) * (0.2 + body * shade);
  col = col + pal(0.75) * glow * 0.7;
  col = col * (0.35 + 0.65 * u_intensity);
  // M7 event-art layer: displaced sample blended over the shader look.
  float aeiMix = clamp(u_texMix, 0.0, 1.0) * 0.85;
  vec3 aeiGuide = texture2D(u_eventTex, uv).rgb;
  vec2 aeiUv = clamp(uv + (aeiGuide.rg - 0.5) * 0.08 * aeiMix, 0.0, 1.0);
  vec3 aeiArt = texture2D(u_eventTex, aeiUv).rgb;
  col = mix(col, aeiArt * (0.35 + 0.65 * u_intensity), aeiMix);
  // M8 vision layer: performer glow + crowd boost + motion pulse (no-op at mix 0).
  float aeiSegMix = clamp(u_segMix, 0.0, 1.0);
  vec2 aeiSeg = texture2D(u_segMask, uv).rg;
  vec2 aeiSp = vec2(uv.x, 1.0 - uv.y);
  vec2 aeiB1 = u_perfBox.xy + u_perfBox.zw;
  float aeiHasBox = step(0.0001, u_perfBox.z * u_perfBox.w);
  vec2 aeiDb = max(max(u_perfBox.xy - aeiSp, aeiSp - aeiB1), vec2(0.0));
  float aeiEdge = (1.0 - smoothstep(0.0, 0.035, length(aeiDb))) * aeiHasBox;
  float aeiIn = step(u_perfBox.x, aeiSp.x) * step(aeiSp.x, aeiB1.x) * step(u_perfBox.y, aeiSp.y) * step(aeiSp.y, aeiB1.y) * aeiHasBox;
  col += vec3(1.0, 0.85, 0.6) * (aeiEdge * 0.5 + aeiIn * aeiSeg.r * 0.35) * aeiSegMix;
  col *= 1.0 + aeiSeg.g * 0.35 * aeiSegMix;
  col *= 1.0 + clamp(u_motion, 0.0, 1.0) * aeiSegMix * 0.12 * (0.5 + 0.5 * sin(u_time * 6.0));
  gl_FragColor = vec4(col, 1.0);
}
