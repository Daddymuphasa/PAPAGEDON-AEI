#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 04 · LIQUID — Signature Pack, rebuilt 2026-11-03.
// Molten chrome blobs with specular streaks. Flow follows mids, kicks fire
// ripple rings through the metal.
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
  float t = uTime * (0.3 + uMid * 0.5) * uMotion;
  vec2 w = vec2(fbm(uv * 1.6 + t * 0.3), fbm(uv * 1.6 - t * 0.25 + 4.7));
  vec2 q = uv + (w - 0.5) * (1.2 + uDistortion * 2.0);
  float m = fbm(q * 2.2 + w);
  float bands = 0.5 + 0.5 * sin(m * 14.0 - t * 2.0);
  float edge = smoothstep(0.35, 0.5, bands) * smoothstep(0.65, 0.5, bands);
  float r = length(uv);
  float ripple = 0.5 + 0.5 * sin(r * 22.0 - uTime * 9.0);
  float g = clamp(m * 0.7 + edge * 0.5 + ripple * ripple * kick * 0.6, 0.0, 1.0);
  vec3 col = palette(g + uBass * 0.12);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col *= 0.2 + uEnergy * 0.95;
  col += uAccentColour * pow(edge, 2.0) * (0.4 + uTreble * 0.9);
  col += uBackground * (1.0 - g) * 1.2;
  fragColor = vec4(finish(col, uv, kick), 1.0);
}
