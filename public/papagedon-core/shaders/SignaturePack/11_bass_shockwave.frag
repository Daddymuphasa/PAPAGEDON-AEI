#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 11 · BASS SHOCKWAVE — Signature Pack, rebuilt 2026-11-03.
// Seismic rings detonate outward on every kick while the frame shakes with
// the low end. The heaviest visual in the pack.
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
  float shake = uBass * 0.035 + kick * 0.02;
  uv += (vec2(hash21(vec2(uTime * 61.0, 1.0)), hash21(vec2(5.0, uTime * 57.0))) - 0.5) * shake * 2.0;
  float r = length(uv);
  float t = uTime * (1.0 + uEnergy) * uMotion;
  float w1 = fract(t * 0.5);
  float w2 = fract(t * 0.5 + 0.33);
  float w3 = fract(t * 0.5 + 0.66);
  float dw1 = (r - w1 * 1.8) * 8.0;
  float dw2 = (r - w2 * 1.8) * 8.0;
  float dw3 = (r - w3 * 1.8) * 8.0;
  float rings = exp(-dw1 * dw1) * (1.0 - w1) + exp(-dw2 * dw2) * (1.0 - w2) * 0.7 + exp(-dw3 * dw3) * (1.0 - w3) * 0.5;
  float core = exp(-r * r * 5.0);
  float dust = hash21(floor(uv * 90.0) + floor(t * 10.0)) * uBass * 0.35;
  float g = clamp(rings * (0.6 + kick * 1.1 + uMid * 0.3) + core * (0.6 + kick) + dust, 0.0, 1.0);
  vec3 col = palette(g + uBass * 0.1);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col *= 0.22 + uEnergy * 1.0;
  col += uAccentColour * pow(clamp(rings, 0.0, 1.0), 2.0) * (0.6 + uTreble * 0.8);
  col += uBackground * (1.0 - g) * 1.1;
  fragColor = vec4(finish(col, uv, kick), 1.0);
}
