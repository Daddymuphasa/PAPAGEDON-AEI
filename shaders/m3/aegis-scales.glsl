// Aegis Scales (M3): overlapping metallic scales that flex and shimmer.
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
  p = fract(p * vec2(234.34, 435.73));
  p = p + dot(p, p + 34.23);
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

float scaleMask(vec2 sp) {
  float sd = length(sp * vec2(1.0, 1.45)) - 0.42 + sp.y * 0.12;
  return smoothstep(0.02, -0.03, sd);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * ar;
  float density = 8.0 / max(u_p2, 0.05);
  vec2 q = p * density;
  float row = floor(q.y);
  float off = mod(row, 2.0) * 0.5;
  float flex = sin(u_time * 1.6 * u_speed + row * 0.7) * 0.09 * u_p3 * (0.25 + u_mid);
  float col = floor(q.x + off);
  float h = hash21(vec2(col, row));
  vec2 sp = vec2(fract(q.x + off + flex) - 0.5, fract(q.y) - 0.5);
  vec2 q2 = q + vec2(0.5, 0.5);
  float row2 = floor(q2.y);
  float off2 = mod(row2, 2.0) * 0.5;
  float flex2 = sin(u_time * 1.6 * u_speed + row2 * 0.7 + 1.3) * 0.09 * u_p3 * (0.25 + u_mid);
  vec2 sp2 = vec2(fract(q2.x + off2 + flex2) - 0.5, fract(q2.y) - 0.5);
  float h2 = hash21(vec2(floor(q2.x + off2), row2));
  float back = scaleMask(sp2);
  float front = scaleMask(sp);
  float metal = 0.3 + 0.7 * (sp.y + 0.5);
  float streakPos = 0.12 * sin(u_time * 2.2 * u_speed + h * 6.2831 + u_mid * 3.0);
  float streak = pow(clamp(1.0 - abs(sp.y - streakPos) * 4.0, 0.0, 1.0), 3.0);
  streak = streak * u_p1 * (0.25 + 0.9 * u_mid + 0.4 * u_high);
  float metal2 = 0.3 + 0.7 * (sp2.y + 0.5);
  vec3 col3 = vec3(0.008, 0.008, 0.012);
  col3 = col3 + pal(0.1 + h2 * 0.25 + metal2 * 0.2) * back * 0.35;
  vec3 steel = pal(clamp(0.2 + h * 0.35 + metal * 0.3, 0.0, 1.0));
  col3 = col3 + steel * front * (0.25 + 0.75 * metal) * (0.5 + 0.5 * u_bass + 0.4 * u_pulse);
  col3 = col3 + pal(clamp(0.6 + h * 0.4, 0.0, 1.0)) * front * streak;
  float sparkle = step(0.9965, hash21(floor(p * 60.0) + floor(u_time * 6.0) * 0.37));
  col3 = col3 + vec3(0.8, 0.9, 1.0) * sparkle * u_high * 0.35 * front;
  col3 = col3 * (0.35 + 0.65 * u_intensity);
  // M7 event-art layer: displaced sample blended over the shader look.
  float aeiMix = clamp(u_texMix, 0.0, 1.0) * 0.85;
  vec3 aeiGuide = texture2D(u_eventTex, uv).rgb;
  vec2 aeiUv = clamp(uv + (aeiGuide.rg - 0.5) * 0.08 * aeiMix, 0.0, 1.0);
  vec3 aeiArt = texture2D(u_eventTex, aeiUv).rgb;
  col3 = mix(col3, aeiArt * (0.35 + 0.65 * u_intensity), aeiMix);
  // M8 vision layer: performer glow + crowd boost + motion pulse (no-op at mix 0).
  float aeiSegMix = clamp(u_segMix, 0.0, 1.0);
  vec2 aeiSeg = texture2D(u_segMask, uv).rg;
  vec2 aeiSp = vec2(uv.x, 1.0 - uv.y);
  vec2 aeiB1 = u_perfBox.xy + u_perfBox.zw;
  float aeiHasBox = step(0.0001, u_perfBox.z * u_perfBox.w);
  vec2 aeiDb = max(max(u_perfBox.xy - aeiSp, aeiSp - aeiB1), vec2(0.0));
  float aeiEdge = (1.0 - smoothstep(0.0, 0.035, length(aeiDb))) * aeiHasBox;
  float aeiIn = step(u_perfBox.x, aeiSp.x) * step(aeiSp.x, aeiB1.x) * step(u_perfBox.y, aeiSp.y) * step(aeiSp.y, aeiB1.y) * aeiHasBox;
  col3 += vec3(1.0, 0.85, 0.6) * (aeiEdge * 0.5 + aeiIn * aeiSeg.r * 0.35) * aeiSegMix;
  col3 *= 1.0 + aeiSeg.g * 0.35 * aeiSegMix;
  col3 *= 1.0 + clamp(u_motion, 0.0, 1.0) * aeiSegMix * 0.12 * (0.5 + 0.5 * sin(u_time * 6.0));
  gl_FragColor = vec4(col3, 1.0);
}
