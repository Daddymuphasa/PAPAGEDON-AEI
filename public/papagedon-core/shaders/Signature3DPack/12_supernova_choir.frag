#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Supernova Choir - PAPAGEDON Signature3D Pack
// Particle supernova shells expanding in beat-synced shockwaves over a
// starfield: shells wobble with the mids, ejecta streaks race the highs.
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
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  uv *= 1.0 - kick * 0.06 - uBass * 0.03;
  float t = uTime * (0.4 + uEnergy * 0.25) * uMotion;
  int streaks = int(mix(24.0, 60.0, uDetail));
  float aspect = uResolution.x / uResolution.y;

  vec3 color = uBackground * 0.4;

  // Faint remnant nebula.
  float neb = vnoise(uv * 1.6 + vec2(t * 0.04, -t * 0.03));
  neb += 0.5 * vnoise(uv * 3.4 - vec2(t * 0.06, t * 0.05));
  color += palette(clamp(neb * 0.8, 0.0, 1.0)) * neb * (0.3 + uEnergy * 0.5);

  // Starfield.
  vec2 g = uv * 3.2;
  vec2 id = floor(g);
  float h = hash21(id);
  vec2 spos = fract(g) - 0.5;
  float star = smoothstep(0.09, 0.0, length(spos - (vec2(h, fract(h * 43.0)) - 0.5) * 0.7)) * step(0.9, h);
  color += mix(uPrimaryColour, uAccentColour, h) * star * (0.3 + uTreble * 0.8);

  // Three expanding shockwave shells, synced to the beat clock.
  float rr = length(uv);
  float ang = atan(uv.y, uv.x);
  float wob = sin(ang * 5.0 + t * 1.4) * uMid * 0.22 + sin(ang * 9.0 - t * 0.9) * uMid * 0.1;
  for (int s = 0; s < 3; s++) {
    float off = float(s) / 3.0;
    float ph = fract(t * 0.14 * (0.6 + uEnergy * 0.7) + off + uEvolutionPhase * 0.02);
    float shellR = (0.12 + ph * 2.3) * (1.0 + uBass * 0.15) + wob;
    float shell = exp(-pow((rr - shellR) * 7.0, 2.0)) * (1.0 - ph);
    float sp = texture(uSpectrum, vec2(clamp(0.2 + float(s) * 0.3, 0.0, 1.0), 0.5)).r;
    vec3 scol = palette(clamp(0.45 + float(s) * 0.2 + sp * 0.3, 0.0, 1.0));
    color += scol * shell * (0.7 + sp * 1.6 + kick * 1.6);
  }

  // Ejecta streaks racing outward.
  float spin = t * 0.25 * (0.4 + uMid) + uEvolutionPhase * 0.05;
  for (int i = 0; i < 64; i++) {
    if (i >= streaks) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 1.43, 7.7));
    float h2 = hash21(vec2(fi * 0.91, 3.1));
    float h3 = hash21(vec2(fi * 2.17, 5.9));
    float ea = h1 * 6.2831853 + spin * (0.5 + h2);
    float erad = (0.1 + fract(h2 + t * (0.12 + h3 * 0.2) * (0.5 + uEnergy)) * 2.4) * (1.0 + uBass * 0.2);
    vec2 epos = vec2(cos(ea) * erad, sin(ea) * erad);
    epos.x *= aspect;
    vec2 dd = uv - epos;
    float head = exp(-dot(dd, dd) / 0.0009);
    vec2 tang = vec2(-sin(ea), cos(ea)) * vec2(aspect, 1.0);
    float tail = exp(-abs(dot(dd, vec2(cos(ea)) * vec2(aspect, 0.0) + vec2(0.0, sin(ea)))) * 7.0)
               * exp(-abs(dot(dd, tang)) * 60.0);
    float sp = texture(uSpectrum, vec2(fract(h1 * 4.0), 0.5)).r;
    vec3 ecol = palette(clamp(h3 * 0.6 + sp * 0.5, 0.0, 1.0));
    color += ecol * (head * (0.6 + uTreble * 1.8) + tail * (0.35 + sp)) * (1.0 - erad * 0.3);
  }

  // Remnant core.
  float coreD = length(uv);
  color += mix(uPrimaryColour, uAccentColour, clamp(uEnergy, 0.0, 1.0)) * (0.5 + kick * 2.2 + uBass * 0.7) * exp(-coreD * coreD * 8.0);

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
