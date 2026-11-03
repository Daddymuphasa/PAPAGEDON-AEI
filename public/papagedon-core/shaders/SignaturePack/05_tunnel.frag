#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 05 · TUNNEL — Signature Pack, rebuilt 2026-11-03.
// A warp tunnel with rotating arms rushing at the camera. Rush speed
// follows energy, arm count follows mids, kicks lurch the flight forward.
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
  float t = uTime * (1.2 + uEnergy * 2.2) * uMotion;
  float r = max(length(uv), 0.02);
  float a = atan(uv.y, uv.x);
  float depth = 1.0 / r;
  float arms = 3.0 + floor(uMid * 4.0);
  float wall = 0.5 + 0.5 * sin(depth * 3.0 - t * 4.0 + kick * 2.0);
  float spokes = 0.5 + 0.5 * sin(a * arms + depth * 1.5 - t * 1.2);
  float core = exp(-r * 2.5) * (0.5 + kick);
  float g = clamp(wall * 0.55 + spokes * 0.35 + core * 0.5, 0.0, 1.0);
  g *= smoothstep(2.2, 0.4, r * (1.0 + uEnergy * 0.3));
  vec3 col = palette(g + uBass * 0.12);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col *= 0.2 + uEnergy * 1.0;
  col += uAccentColour * pow(core, 2.0) * (0.5 + uTreble);
  col += uBackground * (1.0 - g) * 1.2;
  fragColor = vec4(finish(col, uv, kick), 1.0);
}
