#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 08 · LASER FAN — Signature Pack, rebuilt 2026-11-03.
// Nine razor beams sweep from the stage floor. Sweep follows mids, beams
// sharpen and flash on kicks, haze glows with energy.
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
  float t = uTime * (0.7 + uEnergy * 0.8) * uMotion;
  vec2 anchor = vec2(0.0, -1.05);
  float g = 0.0;
  for (int i = 0; i < 9; ++i) {
    float fi = float(i);
    float ang = -0.9 + fi * 0.225 + sin(t * (0.8 + uMid * 1.4) + fi * 0.7) * (0.25 + uMid * 0.35);
    vec2 dir = vec2(sin(ang), cos(ang));
    vec2 rel = uv - anchor;
    float along = dot(rel, dir);
    float side = abs(dot(rel, vec2(-dir.y, dir.x)));
    float width = 0.012 + 0.02 * (1.0 - kick * 0.6);
    float beam = smoothstep(width * 3.0, 0.0, side) * smoothstep(-0.1, 0.3, along) * exp(-along * 0.35);
    float flick = 0.75 + 0.25 * sin(t * 24.0 + fi * 3.0);
    g += beam * flick * (0.6 + uEnergy * 0.5 + uTreble * 0.4);
  }
  g = clamp(g, 0.0, 1.5);
  float haze = hash21(floor(uv * 40.0) + floor(t * 8.0)) * 0.08 * uEnergy;
  vec3 col = palette(clamp(g * 0.6 + uBass * 0.12, 0.0, 1.0));
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col *= 0.25 + uEnergy * 0.9;
  col += uAccentColour * clamp(g - 0.6, 0.0, 1.0) * (0.8 + kick * 1.2);
  col += uBackground * 1.1 + vec3(haze);
  fragColor = vec4(finish(col, uv, kick), 1.0);
}
