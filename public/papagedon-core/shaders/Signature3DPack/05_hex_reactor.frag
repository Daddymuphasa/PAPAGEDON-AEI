#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Hex Reactor Core - PAPAGEDON Signature3D Pack
// Reactor reborn: radar floor with a sweep, plasma arcs, rising embers, a
// travelling scan ring, and a core that detonates light on every kick.
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

// Returns (distance, material): 0 core, 1 rings, 2 beams, 3 floor.
vec3 mapScene(vec3 p) {
  float spin = uEvolutionPhase * 0.35 * (0.4 + uMid * 1.3);
  float kb = uBeat * uBeat;
  float throb = 1.0 + uBass * 0.18 + kb * 0.22;
  vec2 w = vec2(sdHex(p.xz, 0.85 * throb), abs(p.y) - 1.1 * throb);
  float core = min(max(w.x, w.y), 0.0) + length(max(w, vec2(0.0)));
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
  float scanY = -2.0 + 4.0 * fract(uTime * 0.25 * uMotion);
  vec2 sq = vec2(length(p.xz) - 1.3, p.y - scanY);
  float scan = length(sq) - 0.05;
  float rings = min(r1, min(r2, min(r3, scan)));
  float beamA = abs(sdHex(p.xz, 0.32 + kb * 0.1)) - 0.05;
  float beams = max(beamA, abs(p.y) - 3.2);
  float floorD = p.y + 2.2;
  float d = core;
  float mat = 0.0;
  if (rings < d) { d = rings; mat = 1.0; }
  if (beams < d) { d = beams; mat = 2.0; }
  if (floorD < d) { d = floorD; mat = 3.0; }
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
  uv *= 1.0 - kick * 0.1 - uBass * 0.05 - uEnergy * 0.03;
  float t = uTime * (0.3 + uEnergy * 0.2) * uMotion;
  int steps = int(mix(20.0, 48.0, uDetail));
  int embers = int(mix(8.0, 20.0, uDetail));

  float camA = uEvolutionPhase * 0.12 * (0.5 + uMid) + 0.6;
  float camR = 6.8 - kick * 0.9 - uBass * 0.5;
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
  float pattern = 0.0;
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
      color += base * (0.7 + kick * 2.4 + uBass * 0.8);
      color += uAccentColour * spec;
      color += base * fres * (0.6 + uEnergy);
      pattern = 0.95;
    } else if (mat < 1.5) {
      float band = fract((pos.y + pos.x * 0.5 + pos.z * 0.3) * 0.4);
      float sp = texture(uSpectrum, vec2(band, 0.5)).r;
      vec3 ringCol = palette(clamp(0.35 + 0.6 * sp, 0.0, 1.0));
      color = ringCol * (1.1 + sp * 1.4 + kick * 2.5);
      color += uAccentColour * spec * 0.6;
      pattern = 0.8;
    } else if (mat < 2.5) {
      float flick = 0.75 + 0.25 * sin(uTime * 24.0 + pos.y * 9.0) * (0.4 + uTreble);
      vec3 beamCol = mix(uPrimaryColour, uAccentColour, clamp(uEnergy, 0.0, 1.0));
      color = beamCol * (1.4 + kick * 2.6) * flick;
      pattern = 0.9;
    } else {
      vec3 base = uBackground * 1.2 + uSecondaryColour * 0.14;
      color = base * (0.3 + 0.7 * dif);
      // Radar grid with a rotating sweep.
      float rr = length(pos.xz);
      float rl = abs(fract(rr * 0.5) - 0.5);
      float rings = 1.0 - smoothstep(0.44, 0.5, rl);
      float spa = abs(fract(atan(pos.z, pos.x) / 6.2831853 * 12.0) - 0.5);
      float spokes = 1.0 - smoothstep(0.44, 0.5, spa);
      float sw = pow(0.5 + 0.5 * sin(atan(pos.z, pos.x) - t * 3.0), 16.0) * exp(-rr * 0.25);
      color += uPrimaryColour * (rings * 0.35 + spokes * 0.22) * (0.4 + uEnergy * 0.6);
      color += uAccentColour * sw * (0.8 + uBass * 1.2 + kick);
      float fring = exp(-pow((rr - ((1.0 - kick) * 8.0 + 0.3)) * 1.5, 2.0)) * kick;
      color += uAccentColour * fring * 1.2;
      pattern = 0.45;
    }
    float fogF = 1.0 - exp(-hit.x * 0.1);
    color = mix(color, uBackground * 0.7 + uPrimaryColour * 0.08 * uEnergy, fogF * 0.7);
  }

  // Core detonates light on the kick.
  vec3 coreW = vec3(0.0, 0.1, 0.0);
  vec3 cv = coreW - ro;
  float ca2 = dot(cv, fw);
  if (ca2 > 0.1) {
    vec2 csuv = vec2(dot(cv, rt), dot(cv, up)) / ca2 * 1.7;
    csuv.x *= uResolution.x / uResolution.y;
    float coreD = length(uv - csuv);
    color += uAccentColour * (0.5 + kick * 2.6 + uBass * 0.7) * exp(-coreD * coreD * 7.0);
    color += uPrimaryColour * kick * exp(-coreD * coreD * 2.2) * 1.2;
    pattern = max(pattern, (0.5 + kick * 0.5) * exp(-coreD * coreD * 3.0));
  }

  // Plasma arcs lashing from the core to the rings.
  for (int b = 0; b < 3; b++) {
    float endA = t * (0.5 + uMid) + float(b) * 2.0944;
    vec3 arcEnd = vec3(cos(endA) * 1.9, 0.2 + sin(t * 1.3 + float(b)) * 0.5, sin(endA) * 1.9);
    vec3 arcStart = vec3(0.0, 1.0, 0.0);
    float jt = floor(uTime * 24.0) + float(b) * 7.0;
    for (int s = 0; s < 6; s++) {
      float f = (float(s) + 0.5) / 6.0;
      vec3 pp = mix(arcStart, arcEnd, f);
      pp.x += (hash21(vec2(float(s) * 3.1, jt)) - 0.5) * 0.35;
      pp.z += (hash21(vec2(float(s) * 5.7, jt + 3.0)) - 0.5) * 0.35;
      vec3 vd = pp - ro;
      float along = dot(vd, fw);
      if (along > 0.1) {
        vec2 suv = vec2(dot(vd, rt), dot(vd, up)) / along * 1.7;
        suv.x *= uResolution.x / uResolution.y;
        float flick = 0.6 + 0.4 * sin(uTime * 40.0 + float(s) * 3.0 + float(b));
        float m = exp(-dot(uv - suv, uv - suv) * 2600.0);
        color += mix(vec3(1.0), uAccentColour, 0.35) * m * (0.8 + uTreble + kick * 1.4) * flick;
        pattern = max(pattern, m * 0.7);
      }
    }
  }

  // Rising embers.
  for (int i = 0; i < 22; i++) {
    if (i >= embers) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 1.19, 5.5));
    float h2 = hash21(vec2(fi * 0.87, 2.3));
    float rise = fract(h1 + t * (0.15 + h2 * 0.2));
    vec3 pp = vec3((h2 - 0.5) * 5.0 + sin(t + fi) * 0.3, -2.0 + rise * 5.5, (hash21(vec2(fi, 9.1)) - 0.5) * 5.0);
    vec3 vd = pp - ro;
    float along = dot(vd, fw);
    if (along > 0.1) {
      vec2 suv = vec2(dot(vd, rt), dot(vd, up)) / along * 1.7;
      suv.x *= uResolution.x / uResolution.y;
      float m = exp(-dot(uv - suv, uv - suv) * 3200.0);
      float fade = (1.0 - rise) * smoothstep(0.0, 0.08, rise);
      color += mix(uPrimaryColour, uAccentColour, rise) * m * fade * (0.7 + uEnergy * 0.8);
      pattern = max(pattern, m * fade * 0.5);
    }
  }

  float burst = kick * exp(-length(uv) * 1.6) * 1.4;
  pattern = clamp(pattern + burst, 0.0, 1.0);
  color += palette(pattern + uBass * 0.15) * burst;

  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  float sat = clamp(uSaturationBase + 0.3 + uIntensity * uSaturationScale, 0.0, 1.35);
  color = mix(vec3(luma), color, sat);
  color *= (0.14 + uEnergy * 1.2) * uMasterExposure * (0.45 + 0.8 * pattern + 0.35);
  color += uBackground * (1.0 - pattern) * 1.3;
  color += color * kick * 1.0;
  color += color * uBass * 0.35;
  color += color * uGlow * uMasterGlow;
  color += color * color * uBloom * 1.2;
  color *= mix(vec3(0.9, 1.0, 1.1), vec3(1.1, 1.0, 0.9), clamp(uMood, 0.0, 1.0));
  if (uNoise > 0.001) {
    float gr = hash21(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5;
    color += gr * uNoise * 0.22;
  }
  float vd = length(uv);
  color *= 1.0 - 0.28 * smoothstep(0.8, 1.7, vd);
  color *= uMasterBrightness;
  color = aces(color * 1.2);
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
