#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Chrome Tide - PAPAGEDON Signature3D Pack
// A rolling chrome ocean: swell rises with the bass, the heading sways with
// the mids, crests foam white, and the kick sends a tidal pulse through it.
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

// Rolling swell: three directional waves plus treble chop.
float waveH(vec2 p, float t) {
  float swell = 0.45 + uBass * 1.1;
  float h = sin(dot(p, vec2(0.32, 0.24)) + t * 1.1) * 0.55;
  h += sin(dot(p, vec2(-0.21, 0.38)) + t * 1.5) * 0.3;
  h += sin(dot(p, vec2(0.53, -0.31)) + t * 2.1) * 0.18;
  h += sin(p.x * 4.1 + t * 3.4) * sin(p.y * 3.7 - t * 2.8) * (0.06 + uTreble * 0.1);
  float d = length(p * 0.35);
  float kb = uBeat * uBeat;
  h += sin(d * 5.0 - uTime * 6.0) * exp(-d * 0.5) * kb * 0.8;
  return h * swell * 0.5;
}

vec3 envMap(vec3 d, float t) {
  float up = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uBackground * 0.75, uPrimaryColour * 0.45, up);
  float bx = clamp(d.x * 0.5 + 0.5, 0.0, 1.0);
  float sp = texture(uSpectrum, vec2(bx, 0.5)).r;
  col += uAccentColour * sp * up * 1.5;
  col += uSecondaryColour * pow(clamp(1.0 - abs(d.y), 0.0, 1.0), 5.0) * 0.7;
  vec3 moonDir = normalize(vec3(-0.35, 0.55, 0.4));
  col += mix(uAccentColour, vec3(1.0), 0.5) * pow(clamp(dot(d, moonDir), 0.0, 1.0), 240.0) * (1.2 + uTreble * 2.5);
  col += uPrimaryColour * (0.5 + 0.5 * sin(d.x * 4.0 - t * 0.6 + d.z * 2.0)) * 0.18 * up;
  return col;
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  uv *= 1.0 - kick * 0.05 - uBass * 0.03;
  float t = uTime * (0.4 + uEnergy * 0.25) * uMotion;
  int steps = int(mix(20.0, 48.0, uDetail));

  float head = uEvolutionPhase * 0.07 * (0.5 + uMid) + sin(t * 0.2) * 0.25 * (0.4 + uMid);
  vec3 ro = vec3(sin(head) * 7.0, 2.0 - kick * 0.3, cos(head) * 7.0);
  vec3 ta = vec3(0.0, -0.5 + uBass * 0.4, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.5 * fw);

  float tt = 0.0;
  float hitT = -1.0;
  for (int i = 0; i < 56; i++) {
    if (i >= steps) break;
    vec3 p = ro + rd * tt;
    float d = p.y - waveH(p.xz, t);
    if (d < 0.015) { hitT = tt; break; }
    tt += clamp(d * 0.7, 0.04, 1.2);
    if (tt > 24.0) break;
  }

  vec3 color;
  if (hitT < 0.0) {
    color = envMap(rd, t);
  } else {
    vec3 p = ro + rd * hitT;
    float e = 0.09;
    float hC = waveH(p.xz, t);
    float hX = waveH(p.xz + vec2(e, 0.0), t);
    float hZ = waveH(p.xz + vec2(0.0, e), t);
    vec3 n = normalize(vec3(hC - hX, e, hC - hZ));
    vec3 r = reflect(rd, n);
    vec3 mirror = envMap(normalize(r), t);
    vec3 deep = uBackground * 0.5 + uSecondaryColour * (hC * 0.5 + 0.3);
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    color = mix(deep, mirror, fres);
    float foam = smoothstep(0.32, 0.62, hC + uBass * 0.18 + uTreble * 0.05);
    color = mix(color, mix(uAccentColour, vec3(1.0), 0.45), foam * 0.65);
    color += mirror * kick * 0.45;
  }

  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  float sat = clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3);
  color = mix(vec3(luma), color, sat);
  color *= (0.5 + uEnergy * 0.9) * uMasterExposure;
  color += uBackground * 0.22;
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
