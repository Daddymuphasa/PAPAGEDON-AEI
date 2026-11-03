#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// 02 · NEBULA — Signature Pack, rebuilt 2026-11-03.
// Warped star-clouds over two parallax starfields. Clouds breathe with bass,
// treble twinkles the stars, kicks punch the frame inward.
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
float warpedFbm(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.10)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.08, 0.0)));
  return fbm(p + (0.6 + uDistortion) * q);
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
float starLayer(vec2 uv, float scale, float t, float thresh) {
  vec2 cell = floor(uv * scale);
  float star = hash21(cell);
  float on = step(thresh, star);
  float tw = 0.5 + 0.5 * sin(t * (4.0 + star * 6.0) + star * 40.0);
  vec2 pos = fract(uv * scale) - 0.5;
  float d = length(pos + (vec2(hash21(cell + 7.0), hash21(cell + 13.0)) - 0.5) * 0.6);
  return on * tw * smoothstep(0.12, 0.0, d);
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0; uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  uv *= 1.0 - kick * 0.12 - uBass * 0.06;
  float t = uTime * (0.2 + uEnergy * 0.15) * uMotion;
  float clouds = pow(clamp(warpedFbm(uv * 1.1 + vec2(t * 0.05, -t * 0.04), t * 0.6) * 1.4, 0.0, 1.0), 1.6);
  float stars = starLayer(uv, 24.0, t, 0.93) * 0.7 + starLayer(uv * 1.7 + 3.1, 48.0, t * 1.4, 0.96) * 0.5;
  stars *= 0.35 + uTreble * 1.1;
  float g = clamp(clouds + stars * 0.8, 0.0, 1.0);
  vec3 col = palette(g + uBass * 0.12);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3));
  col *= 0.16 + uEnergy * 1.05;
  col += vec3(0.9, 0.95, 1.0) * stars * (0.25 + uTreble * 0.6) * mix(vec3(1.0), uAccentColour + 0.4, 0.5);
  col += uBackground * (1.0 - g) * 1.3;
  fragColor = vec4(finish(col, uv, kick), 1.0);
}
