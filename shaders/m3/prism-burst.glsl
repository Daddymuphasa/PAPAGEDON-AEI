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
  gl_FragColor = vec4(col, 1.0);
}
