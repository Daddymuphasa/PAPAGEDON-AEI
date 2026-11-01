#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Hex Reactor Core - PAPAGEDON Signature3D Pack
// A pulsing hexagonal reactor core wrapped in rotating containment rings:
// the core throbs with the bass, rings spin with the mids, conduits flare.
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

float sdHex(vec2 p, float r) {
  vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

float sdTorus(vec3 p, float R, float r) {
  vec2 q = vec2(length(p.xz) - R, p.y);
  return length(q) - r;
}

// Returns (distance, material): 0 core, 1 rings, 2 beams.
vec3 mapScene(vec3 p) {
  float spin = uEvolutionPhase * 0.35 * (0.4 + uMid * 1.3);
  float kb = uBeat * uBeat;
  float throb = 1.0 + uBass * 0.18 + kb * 0.22;
  // Hexagonal prism core.
  vec2 w = vec2(sdHex(p.xz, 0.85 * throb), abs(p.y) - 1.1 * throb);
  float core = min(max(w.x, w.y), 0.0) + length(max(w, vec2(0.0)));
  // Three containment rings, each tilted and spinning.
  float c1 = cos(spin);
  float s1 = sin(spin);
  vec3 p1 = p;
  p1.xy = mat2(c1, -s1, s1, c1) * p1.xy;
  float r1 = sdTorus(p1, 1.9, 0.09 + uBass * 0.05);
  float c2 = cos(spin * 1.4 + 2.1);
  float s2 = sin(spin * 1.4 + 2.1);
  vec3 p2 = p;
  p2.yz = mat2(c2, -s2, s2, c2) * p2.yz;
  float r2 = sdTorus(p2, 2.35, 0.07 + uBass * 0.04);
  float c3 = cos(-spin * 0.8 + 4.2);
  float s3 = sin(-spin * 0.8 + 4.2);
  vec3 p3 = p;
  p3.xz = mat2(c3, -s3, s3, c3) * p3.xz;
  float r3 = sdTorus(vec3(p3.x, p3.y * 1.6, p3.z), 1.5, 0.06);
  float rings = min(r1, min(r2, r3));
  // Vertical energy beams through the core faces.
  float beamA = abs(sdHex(p.xz, 0.32 + kb * 0.1)) - 0.05;
  float beams = max(beamA, abs(p.y) - 3.2);
  float d = core;
  float mat = 0.0;
  if (rings < d) { d = rings; mat = 1.0; }
  if (beams < d) { d = beams; mat = 2.0; }
  return vec3(d, mat, 0.0);
}

vec3 calcNormal(vec3 p) {
  const float e = 0.002;
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * mapScene(p + k.xyy * e).x +
                   k.yyx * mapScene(p + k.yyx * e).x +
                   k.yxy * mapScene(p + k.yxy * e).x +
                   k.xxx * mapScene(p + k.xxx * e).x);
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  uv *= 1.0 - kick * 0.06 - uBass * 0.03;
  float t = uTime * (0.3 + uEnergy * 0.2) * uMotion;
  int steps = int(mix(20.0, 48.0, uDetail));

  float camA = uEvolutionPhase * 0.12 * (0.5 + uMid) + 0.6;
  float camR = 6.8 - kick * 0.7 - uBass * 0.4;
  vec3 ro = vec3(cos(camA) * camR, 1.9 + sin(t * 0.35) * 0.5, sin(camA) * camR);
  vec3 ta = vec3(0.0, 0.1, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.7 * fw);

  float dist = 0.0;
  vec2 hit = vec2(100.0, -1.0);
  for (int i = 0; i < 60; i++) {
    if (i >= steps) break;
    vec3 res = mapScene(ro + rd * dist);
    if (res.x < 0.002 * (1.0 + dist * 0.2)) { hit = vec2(dist, res.y); break; }
    dist += res.x * 0.85;
    if (dist > 26.0) break;
  }

  vec3 color;
  if (hit.y < -0.5) {
    float g = clamp(0.5 - 0.5 * rd.y, 0.0, 1.0);
    color = uBackground * (0.35 + 0.65 * g);
    vec2 suv = rd.xz / (abs(rd.y) + 0.4);
    float st = hash21(floor(suv * 22.0));
    float star = smoothstep(0.984, 1.0, st) * (0.35 + uTreble * 0.9);
    color += uAccentColour * star * 0.8;
  } else {
    vec3 pos = ro + rd * hit.x;
    float mat = hit.y;
    vec3 n = calcNormal(pos);
    vec3 ld = normalize(vec3(0.45, 0.8, 0.4));
    float dif = clamp(dot(n, ld) * 0.5 + 0.5, 0.0, 1.0);
    vec3 hv = normalize(ld - rd);
    float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 48.0) * (0.6 + uTreble * 1.8);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
    if (mat < 0.5) {
      float sp = texture(uSpectrum, vec2(clamp(pos.y * 0.2 + 0.5, 0.0, 1.0), 0.5)).r;
      vec3 base = palette(clamp(0.6 + 0.4 * sp, 0.0, 1.0));
      color = base * (0.35 + 0.75 * dif);
      color += base * (0.7 + kick * 2.0 + uBass * 0.8);
      color += uAccentColour * spec;
      color += base * fres * (0.6 + uEnergy);
    } else if (mat < 1.5) {
      float band = fract((pos.y + pos.x * 0.5 + pos.z * 0.3) * 0.4);
      float sp = texture(uSpectrum, vec2(band, 0.5)).r;
      vec3 ringCol = palette(clamp(0.35 + 0.6 * sp, 0.0, 1.0));
      color = ringCol * (1.1 + sp * 1.4 + kick * 1.2);
      color += uAccentColour * spec * 0.6;
    } else {
      float flick = 0.75 + 0.25 * sin(uTime * 24.0 + pos.y * 9.0) * (0.4 + uTreble);
      vec3 beamCol = mix(uPrimaryColour, uAccentColour, clamp(uEnergy, 0.0, 1.0));
      color = beamCol * (1.4 + kick * 2.2) * flick;
    }
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
