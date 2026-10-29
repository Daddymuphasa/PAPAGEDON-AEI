// Hex Core (M3): hexagonal light field with a bass-driven glowing core.
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
  vec2 centered = (uv - 0.5) * ar;
  float r = length(centered);
  vec2 p = centered * 7.0;
  vec2 s = vec2(1.0, 1.7320508);
  vec2 a = mod(p, s) - 0.5 * s;
  vec2 b = mod(p - 0.5 * s, s) - 0.5 * s;
  float pick = dot(a, a) < dot(b, b) ? 0.0 : 1.0;
  vec2 g = pick < 0.5 ? a : b;
  float d = length(g);
  vec2 lattice = floor((p - g) * 2.0);
  float h = hash21(lattice);
  float wave = sin(r * 9.0 - u_time * (1.5 + 3.0 * u_p1) * u_speed - u_bass * 4.0) * 0.5 + 0.5;
  float height = 0.35 + 0.65 * h;
  float tile = smoothstep(0.5, 0.18, d) * height;
  float edge = smoothstep(0.05, 0.0, abs(d - 0.46)) * 0.5;
  float lit = tile * (0.2 + wave * (0.35 + 0.9 * u_bass) * u_p3);
  lit = lit + edge * (0.15 + 0.5 * u_mid);
  lit = lit + step(0.94, h) * u_pulse * 0.8 * tile;
  float core = smoothstep(u_p2 + u_bass * 0.12 + u_pulse * 0.1, 0.0, r);
  vec3 col = vec3(0.008, 0.008, 0.012);
  col = col + pal(clamp(lit + r * 0.25, 0.0, 1.0)) * lit;
  col = col + pal(clamp(0.5 + u_bass * 0.5, 0.0, 1.0)) * core * (0.7 + 0.6 * u_intensity);
  col = col * (0.35 + 0.65 * u_intensity);
  gl_FragColor = vec4(col, 1.0);
}
