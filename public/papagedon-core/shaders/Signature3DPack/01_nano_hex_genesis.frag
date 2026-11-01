#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Nano Hex Genesis - PAPAGEDON Signature3D Pack
// Hex lattice reborn: pulse waves race through the columns, the floor is a
// glowing grid with kick shockwaves, halo rings orbit the core, shards fly.
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

float sdTorusFlat(vec3 p, float R, float r) {
  vec2 q = vec2(length(p.xz) - R, p.y);
  return length(q) - r;
}

// Returns (distance, material, spectrum): 0 column, 1 floor, 2 core, 3 halo.
vec3 mapScene(vec3 p) {
  float rotA = uEvolutionPhase * 0.12 * (0.4 + uMid * 1.2);
  float ca = cos(rotA);
  float sa = sin(rotA);
  p.xz = mat2(ca, -sa, sa, ca) * p.xz;
  vec2 cell = floor((p.xz + 2.0) / 4.0);
  float cellId = cell.x * 57.0 + cell.y * 131.0;
  vec2 q = vec2(mod(p.x + 2.0, 4.0) - 2.0, mod(p.z + 2.0, 4.0) - 2.0);
  float sp = texture(uSpectrum, vec2(fract(cellId * 0.159), 0.5)).r;
  float colR = 0.5 + 0.4 * uBass + 0.25 * sp;
  float col = sdHex(q, colR);
  float floorD = p.y + 1.6;
  float kb = uBeat * uBeat;
  vec3 coreC = vec3(0.0, 0.6, 0.0);
  float core = length(p - coreC) - (0.9 + kb * 0.6 + uEnergy * 0.2);
  float halo1 = sdTorusFlat(p - coreC, 1.7 + kb * 0.35, 0.06);
  vec3 hp = p - coreC;
  float ha = uEvolutionPhase * 0.5 * (0.4 + uMid);
  float hc = cos(ha);
  float hs = sin(ha);
  hp.xy = mat2(hc, -hs, hs, hc) * hp.xy;
  float halo2 = sdTorusFlat(hp, 2.2 + kb * 0.4, 0.05);
  float halo = min(halo1, halo2);
  float d = col;
  float mat = 0.0;
  if (floorD < d) { d = floorD; mat = 1.0; }
  if (core < d) { d = core; mat = 2.0; }
  if (halo < d) { d = halo; mat = 3.0; }
  return vec3(d, mat, sp);
}

vec3 calcNormal(vec3 p) {
  const float e = 0.0025;
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
  int steps = int(mix(24.0, 64.0, uDetail));
  int shards = int(mix(6.0, 14.0, uDetail));

  float camA = uEvolutionPhase * 0.18 * (0.5 + uMid * 1.4);
  float camR = 6.5 - kick * 0.9 - uBass * 0.5;
  vec3 ro = vec3(cos(camA) * camR, 2.4 + sin(t * 0.3) * 0.5, sin(camA) * camR);
  vec3 ta = vec3(0.0, 0.4, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.6 * fw);

  float dist = 0.0;
  vec3 hit = vec3(100.0, -1.0, 0.0);
  for (int i = 0; i < 80; i++) {
    if (i >= steps) break;
    vec3 res = mapScene(ro + rd * dist);
    if (res.x < 0.0025 * (1.0 + dist * 0.2)) { hit = vec3(dist, res.y, res.z); break; }
    dist += res.x * 0.9;
    if (dist > 30.0) break;
  }

  vec3 color;
  float pattern = 0.0;
  if (hit.y < -0.5) {
    float g = clamp(0.5 - 0.5 * rd.y, 0.0, 1.0);
    color = uBackground * (0.4 + 0.6 * g);
    vec2 suv = rd.xz / (abs(rd.y) + 0.35);
    float st = hash21(floor(suv * 24.0));
    float star = smoothstep(0.985, 1.0, st) * (0.4 + uTreble) * (0.6 + 0.4 * sin(uTime * 3.0 + st * 40.0));
    color += uAccentColour * star;
  } else {
    vec3 pos = ro + rd * hit.x;
    vec3 n = calcNormal(pos);
    float mat = hit.y;
    float sp = hit.z;
    vec3 ld = normalize(vec3(0.5, 0.8, 0.3));
    float dif = clamp(dot(n, ld) * 0.5 + 0.5, 0.0, 1.0);
    vec3 hv = normalize(ld - rd);
    float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 42.0) * (0.6 + uTreble * 1.6);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
    float ao = clamp(mapScene(pos + n * 0.12).x / 0.12, 0.0, 1.0) * 0.5
             + clamp(mapScene(pos + n * 0.3).x / 0.3, 0.0, 1.0) * 0.5;
    ao = clamp(ao, 0.15, 1.0);
    if (mat < 0.5) {
      vec3 base = palette(clamp(0.25 + 0.5 * sp + pos.y * 0.12, 0.0, 1.0));
      color = base * (0.25 + 0.9 * dif) * ao;
      color += uAccentColour * spec;
      color += palette(fract(sp + t * 0.05)) * fres * (0.5 + uEnergy);
      color += base * sp * uBass * 0.8;
      // Pulse wave racing out from the core through the columns.
      float pw = exp(-pow((length(pos.xz) * 0.6 - fract(t * 0.45) * 7.0) * 1.1, 2.0));
      color += uAccentColour * pw * (0.5 + uBass * 1.2);
      // Travelling glow band up the columns.
      float band = exp(-pow((pos.y - 0.7 - sin(t * 0.8) * 0.35) * 1.8, 2.0));
      color += palette(clamp(sp + 0.2, 0.0, 1.0)) * band * (0.5 + uEnergy * 0.7);
      pattern = 0.55;
    } else if (mat < 1.5) {
      vec3 base = uBackground * 1.2 + palette(0.3) * 0.25;
      color = base * (0.3 + 0.7 * dif) * ao;
      // Glowing grid etched in the floor.
      vec2 gp = abs(fract(pos.xz * 0.5) - 0.5);
      float grid = 1.0 - smoothstep(0.0, 0.06, min(gp.x, gp.y));
      color += uPrimaryColour * grid * (0.25 + uEnergy * 0.6 + sp * 0.3);
      // Kick shockwave racing across the floor.
      float fr = length(pos.xz);
      float fring = exp(-pow((fr - ((1.0 - kick) * 9.0 + 0.3)) * 1.4, 2.0)) * kick;
      color += uAccentColour * fring * 1.5;
      pattern = 0.35;
    } else if (mat < 2.5) {
      vec3 base = mix(palette(0.7), uAccentColour, 0.65);
      color = base * (0.4 + 0.8 * dif);
      color += uAccentColour * (0.8 + kick * 2.2 + uBass * 0.6);
      color += uAccentColour * spec;
      pattern = 0.9;
    } else {
      float hsp = texture(uSpectrum, vec2(0.65, 0.5)).r;
      vec3 hcol = palette(clamp(0.5 + hsp * 0.5, 0.0, 1.0));
      color = hcol * (1.2 + kick * 2.0 + uBass * 0.7 + hsp);
      pattern = 0.8;
    }
    // Distance fog for depth.
    float fogF = 1.0 - exp(-hit.x * 0.12);
    color = mix(color, uBackground * 0.7 + uPrimaryColour * 0.08 * uEnergy, fogF * 0.7);
  }

  // Orbiting hex shards.
  for (int i = 0; i < 16; i++) {
    if (i >= shards) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 1.53, 4.4));
    float h2 = hash21(vec2(fi * 0.71, 8.8));
    float ang = h1 * 6.2831853 + t * (0.4 + h2 * 0.5) * (0.5 + uMid);
    float rad = (3.0 + h2 * 1.4) * (1.0 + uBass * 0.15);
    vec3 pp = vec3(cos(ang) * rad, 0.3 + h1 * 2.2 + sin(t * 0.9 + fi) * 0.25, sin(ang) * rad);
    vec3 vd = pp - ro;
    float along = dot(vd, fw);
    if (along > 0.1) {
      vec2 suv = vec2(dot(vd, rt), dot(vd, up)) / along * 1.6;
      suv.x *= uResolution.x / uResolution.y;
      float spin = t * 2.0 * (0.5 + uMid) + fi * 2.4;
      vec2 lp = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * (uv - suv);
      float sz = 0.035 * (3.4 / max(along, 0.5));
      float hd = abs(lp.x) + abs(lp.y) * 0.6 - sz;
      float body = 1.0 - smoothstep(-0.008, 0.008, hd);
      float rim = 1.0 - smoothstep(0.0, 0.02, abs(hd));
      float glint = pow(clamp(1.0 - length(lp) / max(sz, 0.0001), 0.0, 1.0), 3.0) * (0.5 + uTreble * 2.0);
      color += (palette(h2) * (body * 0.8 + rim * 0.5) + uAccentColour * glint) * body;
      pattern = max(pattern, body * 0.6);
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
