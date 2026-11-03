#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 10 · NEON LATTICE — Signature Pack, rebuilt 2026-11-03.
// An infinite neon grid floor rushing under a glowing horizon. Scroll
// follows energy, the grid bounces with bass, kicks flash the horizon.
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
  float t = uTime * (0.8 + uEnergy * 1.6) * uMotion;
  float bounce = uBass * 0.06 + kick * 0.03;
  vec2 p = vec2(uv.x, uv.y + 0.15 + bounce);
  float horizon = smoothstep(0.03, -0.03, p.y);
  vec2 gp = vec2(p.x / max(p.y + 0.35, 0.05), 1.0 / max(p.y + 0.35, 0.05));
  gp.y += t * 0.7;
  vec2 grid = abs(fract(gp * 2.5) - 0.5);
  float line = 1.0 - smoothstep(0.0, 0.06 + 0.02 * uTreble, min(grid.x, grid.y));
  float fade = exp(-max(p.y, 0.0) * 2.2);
  float hb = p.y * 9.0;
  float hband = exp(-hb * hb);
  float g = clamp(line * fade * (0.6 + uEnergy * 0.6) * horizon + hband * (0.5 + kick * 0.9 + uMid * 0.4), 0.0, 1.0);
  vec3 col = palette(g + uBass * 0.1);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col *= 0.2 + uEnergy * 0.9;
  col += uAccentColour * hband * (0.4 + uTreble * 0.7);
  col += uBackground * (1.0 - g) * 1.1 + uBackground * (1.0 - horizon) * 0.6;
  fragColor = vec4(finish(col, uv, kick), 1.0);
}
