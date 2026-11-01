#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Orbital Swarm - PAPAGEDON Signature3D Pack
// Glowing orbiters weaving 3D paths around a gravity core: radii breathe
// with the bass, the weave dances with the mids, the core flares on kicks.
in vec2 vUV;
out vec4 fragColor;

uniform float uTime;
uniform vec2  uResolution;
uniform float uEnergy;
uniform float uIntensity;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uBeat;
uniform float uMood;
uniform vec3  uPrimaryColour;
uniform vec3  uSecondaryColour;
uniform vec3  uAccentColour;
uniform vec3  uBackground;
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
uniform float uEvolutionPhase;
uniform sampler2D uSpectrum;

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  return t < 0.5 ? mix(uSecondaryColour, uPrimaryColour, t * 2.0)
                 : mix(uPrimaryColour, uAccentColour, (t - 0.5) * 2.0);
}
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// One orbiter's 3D path position at phase ph.
vec3 orbPath(float seed, float ph, float rad) {
  float a = ph * (0.9 + fract(seed * 0.37) * 0.5) + seed * 2.4;
  float b = ph * (1.3 + fract(seed * 0.73) * 0.6) + seed * 1.1;
  return vec3(cos(a) * rad, sin(b) * rad * 0.55, sin(a * 0.9 + seed) * rad);
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  uv *= 1.0 - kick * 0.05 - uBass * 0.02;
  float t = uTime * (0.5 + uEnergy * 0.3) * uMotion;
  int count = int(mix(18.0, 42.0, uDetail));
  float aspect = uResolution.x / uResolution.y;

  vec3 color = uBackground * 0.45;
  vec2 g = uv * 2.6;
  float st = hash21(floor(g));
  color += uPrimaryColour * smoothstep(0.986, 1.0, st) * (0.3 + uTreble * 0.7) * 0.7;

  float ph = t * (0.7 + uMid * 1.8) + uEvolutionPhase * 0.3;
  float breathe = 1.0 + uBass * 0.28 + kick * 0.3;
  float camA = uEvolutionPhase * 0.09 * (0.5 + uMid);
  float ca = cos(camA);
  float sa = sin(camA);

  for (int i = 0; i < 48; i++) {
    if (i >= count) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 1.17, 6.3));
    float h2 = hash21(vec2(fi * 2.03, 1.9));
    float rad = (0.55 + h1 * 1.1) * breathe;
    float sp = texture(uSpectrum, vec2(fract(h1 * 2.0 + h2), 0.5)).r;
    vec3 pcol = palette(clamp(h2 * 0.6 + sp * 0.6, 0.0, 1.0));
    // Head plus two fading ghosts for motion trails.
    for (int k = 0; k < 3; k++) {
      float lag = float(k) * 0.09;
      vec3 pp = orbPath(fi, ph - lag, rad);
      pp.xz = mat2(ca, -sa, sa, ca) * pp.xz;
      float persp = 3.1 / max(pp.z + 3.3, 0.4);
      vec2 suv = vec2(pp.x * persp, pp.y * persp);
      suv.x *= aspect;
      float fade = k == 0 ? 1.0 : (k == 1 ? 0.35 : 0.15);
      float tw = 0.65 + 0.35 * sin(uTime * (3.0 + uTreble * 10.0) + fi * 9.1);
      float sz = 0.016 * persp * (0.7 + sp * 0.8);
      vec2 dd = uv - suv;
      float m = exp(-dot(dd, dd) / max(sz * sz, 0.000001));
      color += pcol * m * (0.5 + sp * 1.6 + uTreble * 0.7) * tw * fade;
    }
  }

  // Gravity core and tilted accretion ring.
  float coreD = length(uv);
  color += uAccentColour * (0.6 + kick * 2.4 + uBass * 0.8) * exp(-coreD * coreD * 9.0);
  vec2 ruv = uv;
  float tilt = 0.5 + uMid * 0.2;
  ruv.y /= max(tilt, 0.15);
  float ringR = abs(length(ruv) - 0.85 * breathe);
  float ringSp = texture(uSpectrum, vec2(0.72, 0.5)).r;
  color += palette(0.6) * exp(-ringR * ringR * 90.0) * (0.5 + ringSp * 1.5 + kick * 0.8);

  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  float sat = clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3);
  color = mix(vec3(luma), color, sat);
  color *= (0.45 + uEnergy * 0.9) * uMasterExposure;
  color += uBackground * 0.2;
  color += color * kick * 0.5;
  color += color * uGlow * uMasterGlow;
  color += color * color * uBloom;
  color *= mix(vec3(0.9, 1.0, 1.1), vec3(1.1, 1.0, 0.9), clamp(uMood, 0.0, 1.0));
  if (uNoise > 0.001) {
    float gr = hash21(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5;
    color += gr * uNoise * 0.2;
  }
  float vd = length(uv);
  color *= 1.0 - 0.3 * smoothstep(0.85, 1.7, vd);
  color *= uMasterBrightness;
  color = aces(color * 1.15);
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
