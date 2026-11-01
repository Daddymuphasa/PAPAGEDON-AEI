#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Chrome Tide - PAPAGEDON Signature3D Pack
// Chrome ocean reborn: a real moon with a glitter path, sweeping lighthouse
// beams, bioluminescent crests, spray sparkle, lantern orbs, blinking rigs.
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

const vec3 MOON_DIR = vec3(-0.35, 0.55, 0.4);

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
  vec3 moonTint = mix(uAccentColour, vec3(1.0), 0.5);
  float md = dot(d, normalize(MOON_DIR));
  col += moonTint * (smoothstep(0.9995, 0.99985, md) * 2.2 + pow(clamp(md, 0.0, 1.0), 350.0) * 1.5);
  col += uPrimaryColour * (0.5 + 0.5 * sin(d.x * 4.0 - t * 0.6 + d.z * 2.0)) * 0.18 * up;
  return col;
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  uv *= 1.0 - kick * 0.1 - uBass * 0.05 - uEnergy * 0.03;
  float t = uTime * (0.4 + uEnergy * 0.25) * uMotion;
  int steps = int(mix(20.0, 48.0, uDetail));
  int spray = int(mix(10.0, 24.0, uDetail));

  float head = uEvolutionPhase * 0.07 * (0.5 + uMid) + sin(t * 0.2) * 0.25 * (0.4 + uMid);
  vec3 ro = vec3(sin(head) * 7.0, 2.0 - kick * 0.4, cos(head) * 7.0);
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
  float pattern = 0.0;
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
    // Bioluminescent crests: living light riding the foam.
    float foam = smoothstep(0.32, 0.62, hC + uBass * 0.18 + uTreble * 0.05);
    vec3 bio = mix(uPrimaryColour, uAccentColour, clamp(uBass * 1.2 + kick * 0.6, 0.0, 1.0));
    color = mix(color, mix(bio, vec3(1.0), 0.35), foam * 0.7);
    color += bio * foam * (0.4 + uBass * 0.9);
    // Moon glitter path dancing toward the viewer.
    vec3 r2 = reflect(rd, n);
    float glit = pow(clamp(dot(r2, normalize(MOON_DIR)), 0.0, 1.0), 60.0);
    glit *= 0.4 + 0.6 * sin(p.x * 9.0 + t * 2.0) * sin(p.z * 23.0 - t * 1.4);
    glit = max(glit, 0.0);
    color += mix(uAccentColour, vec3(1.0), 0.55) * glit * (1.6 + uTreble * 1.6);
    color += mirror * kick * 0.45;
    pattern = clamp(foam + glit, 0.0, 1.0) * 0.7;
  }

  // Twin lighthouse beams sweeping the sky.
  for (int b = 0; b < 2; b++) {
    float side = b == 0 ? -1.0 : 1.0;
    vec2 anchor = vec2(side * 1.1, -0.25);
    float sweep = t * (0.5 + uMid * 0.7) + float(b) * 3.14159;
    vec2 beamDir = normalize(vec2(cos(sweep) * 0.8, 0.9));
    vec2 rel = uv - anchor;
    float len = max(length(rel), 0.001);
    float aim = max(dot(rel / len, beamDir), 0.0);
    float wedge = pow(aim, 30.0) * exp(-len * 1.1);
    wedge *= smoothstep(-0.3, 0.1, uv.y);
    color += mix(uAccentColour, vec3(1.0), 0.4) * wedge * (0.5 + uEnergy * 0.7 + kick * 0.6);
    pattern = max(pattern, wedge * 0.8);
  }

  // Blinking rig lights on the horizon.
  float bl1 = step(0.65, fract(t * 0.35));
  float bl2 = step(0.65, fract(t * 0.35 + 0.5));
  color += uAccentColour * exp(-dot(uv - vec2(-0.7, -0.32), uv - vec2(-0.7, -0.32)) * 2200.0) * bl1 * 1.5;
  color += uPrimaryColour * exp(-dot(uv - vec2(0.75, -0.3), uv - vec2(0.75, -0.3)) * 2200.0) * bl2 * 1.5;

  // Spray sparkle bursting off the crests.
  for (int i = 0; i < 26; i++) {
    if (i >= spray) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 1.37, 6.1));
    float h2 = hash21(vec2(fi * 0.91, 2.7));
    vec2 sxz = vec2((h1 - 0.5) * 10.0, (h2 - 0.5) * 10.0);
    float hop = fract(h1 * 3.0 + t * (0.3 + h2 * 0.4));
    vec3 pp = vec3(sxz.x, waveH(sxz, t) + 0.05 + hop * hop * 1.4, sxz.y);
    vec3 vd = pp - ro;
    float along = dot(vd, fw);
    if (along > 0.1) {
      vec2 suv = vec2(dot(vd, rt), dot(vd, up)) / along * 1.5;
      suv.x *= uResolution.x / uResolution.y;
      float m = exp(-dot(uv - suv, uv - suv) * 2400.0);
      float fade = (1.0 - hop) * (0.4 + uTreble * 1.2);
      color += mix(uPrimaryColour, vec3(1.0), 0.4) * m * fade * 1.8;
      pattern = max(pattern, m * fade);
    }
  }

  // Floating lantern orbs.
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float h1 = hash21(vec2(fi * 2.3, 8.8));
    vec3 pp = vec3((h1 - 0.5) * 9.0 + sin(t * 0.3 + fi * 2.0) * 0.5, 1.2 + fract(h1 * 5.0) * 1.4 + sin(t * 0.5 + fi) * 0.25, -3.0 - fract(h1 * 3.0) * 3.0);
    vec3 vd = pp - ro;
    float along = dot(vd, fw);
    if (along > 0.1) {
      vec2 suv = vec2(dot(vd, rt), dot(vd, up)) / along * 1.5;
      suv.x *= uResolution.x / uResolution.y;
      float pulse = 0.7 + 0.3 * sin(t * 1.5 + fi * 2.6);
      float m = exp(-dot(uv - suv, uv - suv) * 500.0);
      float halo = exp(-dot(uv - suv, uv - suv) * 60.0) * 0.3;
      color += uAccentColour * (m * 1.6 + halo) * pulse * (0.6 + uEnergy * 0.5);
      pattern = max(pattern, (m + halo) * 0.5);
    }
  }

  float burst = kick * exp(-length(uv) * 1.7) * 1.2;
  pattern = clamp(pattern + burst, 0.0, 1.0);
  color += palette(pattern + uBass * 0.15) * burst;

  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  float sat = clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3);
  color = mix(vec3(luma), color, sat);
  color *= (0.16 + uEnergy * 1.1) * uMasterExposure * (0.5 + 0.75 * pattern + 0.3);
  color += uBackground * (1.0 - pattern) * 1.4;
  color += color * kick * 0.9;
  color += color * uBass * 0.3;
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
