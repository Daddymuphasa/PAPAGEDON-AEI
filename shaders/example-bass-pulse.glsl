// Example shader (M1): bass-pulsed rings over the EventTheme palette.
// Written new for this repo. Proves the end-to-end path:
// theme -> director plan -> renderer uniforms -> screen.
precision mediump float;

uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_beat;
uniform float u_intensity;
uniform vec2 u_resolution;
uniform vec3 u_palette[4];

vec3 pal(float t) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  vec3 c1 = mix(u_palette[0], u_palette[1], clamp(t, 0.0, 1.0));
  vec3 c2 = mix(u_palette[1], u_palette[2], clamp(t - 1.0, 0.0, 1.0));
  vec3 c3 = mix(u_palette[2], u_palette[3], clamp(t - 2.0, 0.0, 1.0));
  return t < 1.0 ? c1 : (t < 2.0 ? c2 : c3);
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution - 0.5) * 2.0;
  uv.x *= u_resolution.x / u_resolution.y;
  float r = length(uv);
  float pulse = u_bass * (0.6 + 0.4 * u_beat);
  float rings = sin(r * 8.0 - u_time * (2.0 + 4.0 * pulse) - pulse * 3.0);
  float glow = smoothstep(1.2, 0.0, r + pulse * 0.3);
  float v = clamp(0.5 + 0.5 * rings, 0.0, 1.0) * glow;
  v = pow(v, 1.5 - u_intensity) * (0.35 + 0.65 * u_intensity);
  vec3 col = pal(clamp(v + pulse * 0.4 + u_high * 0.15, 0.0, 1.0));
  col += u_palette[3] * u_mid * 0.2 * glow;
  gl_FragColor = vec4(col, 1.0);
}
