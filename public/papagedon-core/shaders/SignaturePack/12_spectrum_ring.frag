#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 12 · SPECTRUM RING — Signature Pack, rebuilt 2026-11-03.
// A circular analyzer: bass, mids and highs each own a third of the ring.
// Bars dance with their band, ticks orbit with energy, kicks flash the rim.
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

const float kTau = 6.28318530717959;

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  return t < 0.5 ? mix(uSecondaryColour, uPrimaryColour, t * 2.0)
                 : mix(uPrimaryColour, uAccentColour, (t - 0.5) * 2.0);
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
  float t = uTime * (0.5 + uEnergy * 0.7) * uMotion;
  float r = length(uv);
  float a = atan(uv.y, uv.x) / kTau + 0.5;
  float slots = 48.0;
  float slot = floor(a * slots);
  float f = fract(a * slots);
  float third = floor(a * 3.0);
  float band = third < 1.0 ? uBass : (third < 2.0 ? uMid : uTreble);
  float h = 0.1 + band * 0.55 + 0.04 * sin(t * 5.0 + slot);
  float inner = 0.35;
  float barMask = smoothstep(0.42, 0.3, abs(f - 0.5));
  float fill = smoothstep(0.0, 0.015, r - inner) * smoothstep(0.0, 0.015, (inner + h) - r);
  float bars = barMask * fill;
  float tips = barMask * smoothstep(0.025, 0.0, abs(r - (inner + h)));
  float rim = smoothstep(0.02, 0.0, abs(r - inner)) * (0.5 + kick * 1.2);
  float tickA = fract(a * 12.0 + t * 0.4);
  float ticks = smoothstep(0.06, 0.02, abs(tickA - 0.5) - 0.38) * smoothstep(0.02, 0.0, abs(r - 0.28));
  float core = exp(-r * r * 8.0) * (0.4 + uEnergy * 0.5);
  float g = clamp(bars * (0.6 + uEnergy * 0.5) + tips * 0.8 + rim * 0.7 + ticks * 0.4 + core, 0.0, 1.0);
  vec3 col = palette(clamp(band * 0.7 + (r - inner) * 0.9 + uBass * 0.08, 0.0, 1.0)) * (0.35 + g);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col *= 0.5 + uEnergy * 0.7;
  col += uAccentColour * tips * (0.4 + uTreble * 0.7);
  col += uBackground * (1.0 - clamp(g, 0.0, 1.0)) * 1.1;
  fragColor = vec4(finish(col, uv, kick), 1.0);
}
