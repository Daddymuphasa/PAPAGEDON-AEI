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
  gl_FragColor = vec4(col, 1.0);
}
