#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Crystal Throne - PAPAGEDON Signature3D Pack
// Crystal court reborn: orbiting satellite shards, floor caustics, rune
// rings with burning ticks, fracture veins, a light shaft and dust motes.
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

float sdOcta(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

// Returns (distance, material): 0 crystal, 1 pedestal, 2 rings, 3 floor.
vec3 mapScene(vec3 p) {
  float rotA = uEvolutionPhase * 0.25 * (0.3 + uMid * 0.9);
  float ca = cos(rotA);
  float sa = sin(rotA);
  p.xz = mat2(ca, -sa, sa, ca) * p.xz;
  float kb = uBeat * uBeat;
  float grow = 1.0 + uBass * 0.12 + kb * 0.1;
  float cry = sdOcta((p - vec3(0.0, 1.15, 0.0)) / grow, 1.2) * grow;
  // Four satellite shards orbiting the throne.
  float st = uEvolutionPhase * 0.5 * (0.5 + uMid);
  for (int k = 0; k < 4; k++) {
    float ang = st * 0.8 + float(k) * 1.5708;
    vec3 c = vec3(cos(ang) * 2.2, 1.3 + sin(st + float(k)) * 0.3, sin(ang) * 2.2);
    cry = min(cry, sdOcta(p - c, 0.34));
  }
  vec2 dc = vec2(length(p.xz) - 1.3, abs(p.y + 1.05) - 0.25);
  float ped = min(max(dc.x, dc.y), 0.0) + length(max(dc, vec2(0.0)));
  vec2 tq = vec2(length(p.xz) - 1.75, p.y + 0.55);
  float ring = length(tq) - 0.1;
  // Twin rune rings flat on the floor.
  vec2 r1 = vec2(length(p.xz) - 2.4, p.y + 1.22);
  vec2 r2 = vec2(length(p.xz) - 2.9, p.y + 1.22);
  ring = min(ring, min(length(r1) - 0.045, length(r2) - 0.045));
  float floorD = p.y + 1.3;
  float d = cry;
  float mat = 0.0;
  if (ped < d) { d = ped; mat = 1.0; }
  if (ring < d) { d = ring; mat = 2.0; }
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
  int steps = int(mix(24.0, 64.0, uDetail));
  int motes = int(mix(8.0, 20.0, uDetail));

  float camA = uEvolutionPhase * 0.15 * (0.5 + uMid * 1.2);
  float camR = 6.4 - kick * 0.8 - uBass * 0.4;
  vec3 ro = vec3(cos(camA) * camR, 1.7 + sin(t * 0.4) * 0.4, sin(camA) * camR);
  vec3 ta = vec3(0.0, 0.4, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.7 * fw);

  float dist = 0.0;
  vec2 hit = vec2(100.0, -1.0);
  for (int i = 0; i < 80; i++) {
    if (i >= steps) break;
    vec3 res = mapScene(ro + rd * dist);
    if (res.x < 0.002 * (1.0 + dist * 0.2)) { hit = vec2(dist, res.y); break; }
    dist += res.x * 0.9;
    if (dist > 26.0) break;
  }

  vec3 color;
  float pattern = 0.0;
  if (hit.y < -0.5) {
    float g = clamp(0.5 - 0.5 * rd.y, 0.0, 1.0);
    color = uBackground * (0.35 + 0.65 * g);
    vec2 suv = rd.xz / (abs(rd.y) + 0.4);
    float st = hash21(floor(suv * 20.0));
    float star = smoothstep(0.982, 1.0, st) * (0.35 + uTreble);
    color += uPrimaryColour * star;
  } else {
    vec3 pos = ro + rd * hit.x;
    float mat = hit.y;
    vec3 n = calcNormal(pos);
    if (mat < 0.5) {
      vec3 ff = normalize(cross(dFdx(pos), dFdy(pos)));
      if (dot(ff, -rd) < 0.0) ff = -ff;
      n = normalize(mix(n, ff, 0.85));
    }
    vec3 ld = normalize(vec3(0.5, 0.75, 0.35));
    float dif = clamp(dot(n, ld) * 0.5 + 0.5, 0.0, 1.0);
    vec3 hv = normalize(ld - rd);
    float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 60.0) * (0.7 + uTreble * 2.0);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.5);
    float sp = texture(uSpectrum, vec2(0.5, 0.5)).r;
    if (mat < 0.5) {
      vec3 inner = palette(0.78) * (0.6 + uEnergy + kick * 1.5);
      vec3 mirror = palette(clamp(0.5 + 0.5 * dot(reflect(rd, n), ld), 0.0, 1.0));
      color = inner * (0.35 + 0.65 * fres) + mirror * fres * 0.8;
      color += uAccentColour * spec;
      color += inner * sp * uBass * 0.9;
      // Fracture veins burning inside the crystal.
      float fr = smoothstep(0.72, 0.95, vnoise(pos.xy * 3.0 + pos.z * 2.0 + t * 0.15));
      color += inner * fr * (0.6 + uEnergy + kick * 1.6);
      pattern = 0.85;
    } else if (mat < 1.5) {
      vec3 base = uBackground * 1.4 + uSecondaryColour * 0.2;
      color = base * (0.3 + 0.8 * dif);
      color += uPrimaryColour * spec * 0.4;
      pattern = 0.3;
    } else if (mat < 2.5) {
      vec3 ringCol = palette(clamp(0.55 + 0.45 * sp, 0.0, 1.0));
      color = ringCol * (1.2 + uBass * 1.2 + kick * 2.0);
      // Burning rune ticks racing around the flat rings.
      float ang = atan(pos.z, pos.x);
      float flat = 1.0 - smoothstep(0.1, 0.3, abs(n.y - 1.0));
      float ticks = step(0.72, fract(ang * 3.8197 + t * (0.6 + uMid * 1.4)));
      float ticks2 = step(0.78, fract(ang * 2.5465 - t * (0.4 + uMid)));
      color += uAccentColour * (ticks + ticks2) * flat * (0.8 + kick * 1.6 + uTreble * 0.5);
      pattern = 0.8;
    } else {
      vec3 base = uBackground * 1.25 + uSecondaryColour * 0.15;
      color = base * (0.3 + 0.7 * dif);
      // Animated light caustics pooling on the floor.
      float ca1 = sin(pos.x * 6.0 + t * 1.6 + sin(pos.z * 5.0 - t * 1.2) * 1.2);
      float ca2 = sin(pos.z * 7.0 - t * 1.4 + sin(pos.x * 4.0 + t) * 1.2);
      float caust = pow(clamp(1.0 - abs(ca1 + ca2) * 0.35, 0.0, 1.0), 6.0);
      color += mix(uPrimaryColour, uAccentColour, 0.5) * caust * (0.5 + uEnergy * 0.8 + uBass * 0.4);
      float fr = length(pos.xz);
      float fring = exp(-pow((fr - ((1.0 - kick) * 8.0 + 0.3)) * 1.5, 2.0)) * kick;
      color += uAccentColour * fring * 1.3;
      pattern = 0.4;
    }
    float fogF = 1.0 - exp(-hit.x * 0.1);
    color = mix(color, uBackground * 0.7 + uPrimaryColour * 0.08 * uEnergy, fogF * 0.7);
  }

  // Light shaft pouring onto the throne.
  vec3 topW = vec3(0.0, 1.1, 0.0);
  vec3 tv = topW - ro;
  float ta2 = dot(tv, fw);
  if (ta2 > 0.1) {
    vec2 tsuv = vec2(dot(tv, rt), dot(tv, up)) / ta2 * 1.7;
    tsuv.x *= uResolution.x / uResolution.y;
    float shaft = exp(-pow((uv.x - tsuv.x) * 2.2, 2.0)) * (1.0 - smoothstep(tsuv.y, tsuv.y + 1.8, uv.y));
    shaft *= smoothstep(tsuv.y - 0.4, tsuv.y + 0.1, uv.y);
    color += uAccentColour * shaft * (0.22 + uEnergy * 0.35 + kick * 0.45);
    pattern = max(pattern, shaft * 0.4);
  }

  // Drifting dust motes in the light.
  for (int i = 0; i < 22; i++) {
    if (i >= motes) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 1.41, 2.2));
    float h2 = hash21(vec2(fi * 0.79, 6.6));
    float h3 = hash21(vec2(fi * 2.03, 4.9));
    vec3 pp = vec3((h1 - 0.5) * 8.0 + sin(t * 0.4 + fi) * 0.5, -0.5 + h2 * 3.6, (h3 - 0.5) * 8.0);
    vec3 vd = pp - ro;
    float along = dot(vd, fw);
    if (along > 0.1) {
      vec2 suv = vec2(dot(vd, rt), dot(vd, up)) / along * 1.7;
      suv.x *= uResolution.x / uResolution.y;
      float tw = 0.5 + 0.5 * sin(uTime * (2.0 + uTreble * 8.0) + fi * 11.3);
      float m = exp(-dot(uv - suv, uv - suv) * 1600.0);
      color += mix(uPrimaryColour, uAccentColour, h3) * m * (0.35 + tw * (0.5 + uTreble));
      pattern = max(pattern, m * 0.4);
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
