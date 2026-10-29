// Circuit Veins (M3): neon circuit traces pulsing energy on each beat.
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
  p = fract(p * vec2(345.67, 123.45));
  p = p + dot(p, p + 56.78);
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
  vec2 p = (uv - 0.5) * ar;
  float density = 5.0 * max(u_p2, 0.1);
  vec2 g = p * density;
  vec2 cell = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash21(cell);
  float horiz = step(h, 0.55);
  float traceH = 1.0 - smoothstep(0.015, 0.05, abs(f.y));
  float traceV = 1.0 - smoothstep(0.015, 0.05, abs(f.x));
  float trace = mix(traceV, traceH, horiz);
  float gate = step(0.18, hash21(cell + 7.0));
  trace = trace * gate;
  vec2 corner = abs(f) - 0.32;
  float pad = (1.0 - smoothstep(0.0, 0.06, max(corner.x, corner.y))) * step(0.72, hash21(cell + 3.0));
  float front = pow(0.5 + 0.5 * sin((cell.x + cell.y) * 0.9 - u_time * (2.0 + 4.0 * u_p1) * u_speed), 4.0);
  float energy = clamp(front * (0.35 + 0.65 * u_bass) + u_pulse * 0.9 + u_mid * 0.15, 0.0, 1.5);
  float node = (1.0 - smoothstep(0.03, 0.09, length(f))) * gate;
  vec3 col = vec3(0.006, 0.007, 0.012);
  col = col + pal(0.1 + 0.15 * h) * trace * 0.25;
  col = col + pal(clamp(0.45 + 0.3 * front + u_high * 0.1, 0.0, 1.0)) * trace * energy;
  col = col + pal(0.7) * pad * (0.3 + energy) * u_p3;
  col = col + pal(0.85) * node * (0.2 + energy * 0.8);
  col = col * (0.35 + 0.65 * u_intensity);
  gl_FragColor = vec4(col, 1.0);
}
