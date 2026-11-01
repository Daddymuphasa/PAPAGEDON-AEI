#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Particle Galaxy 3D - PAPAGEDON Signature3D Pack
// A rotating 3D galaxy spiral of glowing particles: breathes with the bass,
// spins with the mids, twinkles with the highs, core flares on the kick.
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

void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  uv *= 1.0 - kick * 0.05 - uBass * 0.02;
  float t = uTime * (0.35 + uEnergy * 0.25) * uMotion;
  int per = int(mix(28.0, 64.0, uDetail));

  float rot = t * (0.15 + uMid * 0.7) + uEvolutionPhase * 0.1;
  float camA = uEvolutionPhase * 0.08 * (0.5 + uMid);
  float breathe = 1.0 + uBass * 0.25 + kick * 0.15;
  float aspect = uResolution.x / uResolution.y;

  vec3 color = uBackground * 0.5;

  // Distant starfield for depth.
  vec2 g = uv * 3.0 + vec2(t * 0.01, 0.0);
  vec2 id = floor(g);
  float h = hash21(id);
  vec2 spos = fract(g) - 0.5;
  float star = smoothstep(0.08, 0.0, length(spos - (vec2(h, fract(h * 57.0)) - 0.5) * 0.7)) * step(0.92, h);
  color += mix(uPrimaryColour, uAccentColour, h) * star * (0.3 + uTreble * 0.8);

  float ca = cos(camA);
  float sa = sin(camA);
  for (int a = 0; a < 3; a++) {
    float armOff = float(a) * 2.0944;
    for (int i = 0; i < 70; i++) {
      if (i >= per) break;
      float fi = float(i);
      float frac = (fi + 0.5) / float(per);
      float ang = armOff + frac * 5.2 + rot * (1.6 - frac);
      ang += (hash21(vec2(fi, float(a))) - 0.5) * uDistortion * 0.2;
      float rad = (0.15 + frac * 1.5) * breathe;
      float yy = (hash21(vec2(fi * 1.7, float(a) * 3.1)) - 0.5) * (0.12 + frac * 0.5);
      vec3 pp = vec3(cos(ang) * rad, yy, sin(ang) * rad);
      pp.xz = mat2(ca, -sa, sa, ca) * pp.xz;
      pp.y = pp.y * 0.6 + 0.15;
      float persp = 3.2 / max(pp.z + 3.4, 0.4);
      vec2 suv = vec2(pp.x * persp, pp.y * persp);
      suv.x *= aspect;
      float sp = texture(uSpectrum, vec2(clamp(frac, 0.0, 1.0), 0.5)).r;
      float tw = 0.6 + 0.4 * sin(uTime * (2.0 + uTreble * 8.0) + fi * 12.9 + float(a) * 78.2);
      float bright = (0.25 + sp * 1.4 + uTreble * 0.5) * tw * persp;
      vec3 pcol = palette(clamp(1.0 - frac, 0.0, 1.0));
      float sz = (0.012 + 0.03 * sp) * persp;
      vec2 dd = uv - suv;
      float core = exp(-dot(dd, dd) / max(sz * sz, 0.000001));
      float halo = exp(-dot(dd, dd) / max(sz * sz * 25.0, 0.00001)) * 0.25;
      color += pcol * bright * (core + halo);
    }
  }

  float coreD = length(uv - vec2(0.0, 0.14));
  color += uAccentColour * (0.5 + kick * 2.0 + uBass) * exp(-coreD * coreD * 6.0);

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
