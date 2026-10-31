// Prism Burst (M3): crystal shards that burst on hits and reform after.
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

float hash21(vec2 p) {
  p = fract(p * vec2(456.12, 789.34));
  p = p + dot(p, p + 12.34);
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

float sdTri(vec2 q, float r) {
  float a1 = dot(q, vec2(0.0, -1.0)) + r * 0.5;
  float a2 = dot(q, vec2(0.8660254, 0.5)) + r * 0.5;
  float a3 = dot(q, vec2(-0.8660254, 0.5)) + r * 0.5;
  return max(a1, max(a2, a3));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * ar;
  float density = 4.0 * max(u_p1, 0.1);
  vec2 g = p * density;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash21(id);
  float burst = clamp(u_pulse * u_p2 + u_bass * 0.25 * u_p2, 0.0, 2.0);
  float ang0 = h * 6.2831;
  vec2 dir = vec2(cos(ang0), sin(ang0));
  vec2 q = f - dir * burst * 0.45;
  float ang = ang0 + u_time * 0.15 * u_speed * (h - 0.5) + burst * (h - 0.5) * 2.0;
  float ca = cos(ang);
  float sa = sin(ang);
  q = vec2(q.x * ca - q.y * sa, q.x * sa + q.y * ca);
  float sd = sdTri(q, 0.34);
  float face = smoothstep(0.015, -0.015, sd);
  float edge = smoothstep(0.05, 0.0, abs(sd)) * (0.6 + burst * 0.8);
  float grad = clamp(q.y * 2.0 + 0.5, 0.0, 1.0);
  vec3 col = vec3(0.008, 0.008, 0.013);
  col = col + pal(clamp(h * 0.5 + grad * 0.4 + burst * 0.15, 0.0, 1.0)) * face * (0.25 + 0.35 * u_mid);
  col = col + pal(clamp(0.55 + h * 0.4, 0.0, 1.0)) * edge * 0.9;
  float sp = pow(hash21(floor(p * 90.0) + floor(u_time * 10.0) * 0.61), 24.0);
  col = col + vec3(0.9, 0.95, 1.0) * sp * (u_high * u_p3 * 1.5 + burst * 0.3);
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
