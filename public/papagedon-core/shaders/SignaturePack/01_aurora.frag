#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 01 · AURORA — Signature Pack, rebuilt 2026-11-03.
// Layered polar curtains with ray structure. Sway follows mids, brightness
// follows energy, kicks send shimmer down the rays.
in vec2 vUV;
out vec4 fragColor;
uniform float uTime;
uniform vec2 uResolution;
uniform float uEnergy;
uniform float uIntensity;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uBeat;
uniform float uMood;
uniform vec3 uPrimaryColour;
uniform vec3 uSecondaryColour;
uniform vec3 uAccentColour;
uniform vec3 uBackground;
uniform float uGlow;
uniform float uBloom;
uniform float uMotion;
uniform float uNoise;
uniform float uDistortion;
uniform float uSaturationBase;
uniform float uSaturationScale;
uniform float uDetail;
uniform float uMasterBrightness;
uniform float uMasterGlow;
uniform float uMasterExposure;

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  return t < 0.5 ? mix(uSecondaryColour, uPrimaryColour, t * 2.0)
                 : mix(uPrimaryColour, uAccentColour, (t - 0.5) * 2.0);
}
float hash21(vec2 p) { p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0; float a = 0.5; float f = 1.0;
  float g = clamp(0.5 + 0.12 * (uDetail - 1.0), 0.38, 0.66);
  for (int i = 0; i < 4; ++i) { s += a * vnoise(p * f); f *= 2.0; a *= g; }
  return s;
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 finish(vec3 col, vec2 uv, float kick) {
  col += col * kick * 0.8;
  col += col * uBass * 0.25;
  col += col * uGlow * uMasterGlow;
  col += col * col * uBloom;
  col *= mix(vec3(0.9, 1.0, 1.1), vec3(1.1, 1.0, 0.9), clamp(uMood, 0.0, 1.0));
  col *= uMasterExposure;
  col *= 1.0 - 0.3 * smoothstep(0.9, 1.7, length(uv));
  col *= uMasterBrightness;
  return aces(col * 1.2);
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0; uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  float t = uTime * (0.25 + uEnergy * 0.2) * uMotion;
  float warp = fbm(vec2(uv.x * 1.5 + t * 0.2, t * 0.15)) - 0.5;
  float sway = 0.6 + uMid * 0.6;
  vec2 q = vec2(uv.x + warp * sway * (0.5 + uDistortion), uv.y);
  float d1 = (q.y - 0.25 - 0.15 * sin(q.x * 2.0 + t)) * 4.0;
  float d2 = (q.y + 0.15 - 0.12 * sin(q.x * 3.0 - t * 1.3)) * 5.0;
  float band1 = exp(-d1 * d1);
  float band2 = exp(-d2 * d2);
  float rays = pow(0.5 + 0.5 * sin(q.x * 24.0 + fbm(q * 3.0 + t * 0.3) * 6.0), 3.0);
  float g = clamp(band1 * (0.5 + rays * 0.8) + band2 * (0.4 + rays * 0.5), 0.0, 1.0);
  vec3 col = palette(g + uBass * 0.1);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col *= 0.15 + uEnergy * 1.0;
  col += uAccentColour * pow(g, 3.0) * (0.3 + uTreble * 0.8 + kick * 0.5);
  col += uBackground * (1.0 - g) * 1.2;
  fragColor = vec4(finish(col, uv, kick), 1.0);
}
