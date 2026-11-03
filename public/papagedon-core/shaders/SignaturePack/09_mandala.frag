#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 09 · MANDALA — Signature Pack, rebuilt 2026-11-03.
// A twelve-fold breathing mandala. Petals open with energy, treble dusts
// the edges with light. Built for calm, meditative moments.
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
  float t = uTime * (0.15 + uEnergy * 0.15) * uMotion;
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float fold = abs(fract(a / kTau * 6.0) - 0.5) * 2.0;
  float breathe = 0.5 + 0.5 * sin(t * 1.5);
  float petals = 0.5 + 0.5 * sin(fold * 9.0 + r * 8.0 - t * 2.0);
  float rings = 0.5 + 0.5 * sin(r * 18.0 - t * 1.2 + breathe * 2.0);
  float center = exp(-r * 4.0);
  float g = clamp(petals * 0.45 + rings * 0.3 + center * (0.5 + uBass * 0.4), 0.0, 1.0);
  g *= smoothstep(1.5, 0.5, r * (1.1 - uEnergy * 0.2));
  vec3 col = palette(g + uBass * 0.08);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col *= 0.14 + uEnergy * 0.8;
  col += uAccentColour * pow(g, 4.0) * (0.25 + uTreble * 0.7 + kick * 0.3);
  col += uBackground * (1.0 - g) * 1.2;
  fragColor = vec4(finish(col, uv, kick), 1.0);
}
