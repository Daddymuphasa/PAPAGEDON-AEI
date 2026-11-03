#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 06 · PULSE — Signature Pack, rebuilt 2026-11-03.
// A living heartbeat: double-thump rings bloom from the core. The whole
// field swells with bass and detonates softly on every kick.
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
  uv *= 1.0 - kick * 0.16 - uBass * 0.08;
  float r = length(uv);
  float t = uTime * (1.6 + uEnergy * 1.6) * uMotion;
  float thump = exp(-r * r * 3.0);
  float rd1 = (r - fract(t * 0.4) * 1.6) * 6.0;
  float rd2 = (r - fract(t * 0.4 + 0.18) * 1.6) * 7.0;
  float ring1 = exp(-rd1 * rd1);
  float ring2 = exp(-rd2 * rd2) * 0.7;
  float breathe = 0.5 + 0.5 * sin(t * 2.0);
  float g = clamp(thump * (0.7 + kick * 0.9 + uBass * 0.4) + (ring1 + ring2) * (0.4 + uMid * 0.5) + breathe * 0.12, 0.0, 1.0);
  vec3 col = palette(g + uBass * 0.1);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col *= 0.2 + uEnergy * 1.0;
  col += uAccentColour * pow(thump, 2.0) * (0.4 + uTreble * 0.7 + kick * 0.6);
  col += uBackground * (1.0 - g) * 1.2;
  fragColor = vec4(finish(col, uv, kick), 1.0);
}
