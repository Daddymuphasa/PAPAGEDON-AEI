#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 03 · MATRIX — Signature Pack, rebuilt 2026-11-03.
// Falling code rain with glowing heads and phosphor trails. Fall speed
// follows energy, bass sends brightness waves down the columns.
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
  float t = uTime * (0.6 + uEnergy * 1.2) * uMotion;
  float cols = 64.0;
  float col = floor((uv.x * 0.5 + 0.5) * cols);
  float speed = 0.6 + hash21(vec2(col, 3.0)) * 1.4;
  float head = fract(hash21(vec2(col, 9.0)) + t * speed * 0.25);
  float y = vUV.y;
  float trail = 0.35 + uMid * 0.4;
  float d = head - y;
  d = d < 0.0 ? d + 1.0 : d;
  float glyph = step(0.35, hash21(vec2(col, floor((y + t * speed * 0.25) * 48.0))));
  float body = exp(-d * (2.0 + trail * 6.0)) * glyph;
  float headGlow = exp(-d * 40.0);
  float wave = 0.5 + 0.5 * sin(y * 10.0 - uTime * 6.0);
  float g = clamp(body * (0.5 + uEnergy * 0.7) + headGlow * (0.8 + uTreble) + wave * uBass * body, 0.0, 1.0);
  vec3 col3 = palette(clamp(g * 0.75 + hash21(vec2(col, 1.0)) * 0.2 + uBass * 0.1, 0.0, 1.0));
  float luma = dot(col3, vec3(0.299, 0.587, 0.114));
  col3 = mix(vec3(luma), col3, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col3 *= 0.25 + uEnergy * 0.9;
  col3 += uBackground * (1.0 - g) * 1.1;
  fragColor = vec4(finish(col3, uv, kick), 1.0);
}
