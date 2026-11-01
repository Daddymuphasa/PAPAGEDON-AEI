#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Glass Tsunami - PAPAGEDON Signature3D Pack
// Breaking wave reborn: twin curls, rainbow film shimmer, mist, moon
// glitter on the water, glass shards tumbling in the tube, foam that
// detonates white on every kick.
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

const vec3 MOON_DIR = vec3(-0.35, 0.5, 0.55);

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

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Twin breaking waves blended into rising walls over water.
// Returns (distance, material): 0 wave, 1 water.
vec2 mapScene(vec3 p) {
  float kb = uBeat * uBeat;
  float lift = uBass * 0.9 + kb * 0.5 + uEnergy * 0.3;
  float sway = sin(p.z * 0.7 + uTime * 0.6) * 0.25 * (0.5 + uMid);
  vec3 q = vec3(p.x - sway, p.y - lift, p.z);
  float ringD = length(q.xy - vec2(-0.4, 1.9)) - 1.5;
  float tube = max(abs(ringD) - 0.55, abs(q.z) - 2.5);
  float wall = q.x + 1.9 + sin(q.y * 1.4 + uTime * 1.2) * 0.12;
  float wave = smin(tube, wall, 0.5);
  // Second curl rolling in behind.
  vec3 q2 = vec3(p.x - sway * 0.6 + 0.4, p.y - lift * 0.55 - 0.4, p.z + 3.4);
  float ring2 = length(q2.xy - vec2(-0.4, 1.9)) - 1.2;
  float tube2 = max(abs(ring2) - 0.45, abs(q2.z) - 2.2);
  wave = smin(wave, tube2, 0.6);
  float water = p.y + 1.5;
  if (water < wave) return vec2(water, 1.0);
  return vec2(wave, 0.0);
}

vec3 calcNormal(vec3 p) {
  const float e = 0.01;
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
  float t = uTime * (0.35 + uEnergy * 0.2) * uMotion;
  int steps = int(mix(20.0, 48.0, uDetail));
  int spray = int(mix(12.0, 30.0, uDetail));
  int shards = int(mix(6.0, 12.0, uDetail));

  float camA = uEvolutionPhase * 0.1 * (0.5 + uMid) - 0.5;
  float camR = 6.2 - kick * 0.7 - uBass * 0.4;
  vec3 ro = vec3(2.5 + cos(camA) * 2.0, 1.0 + sin(t * 0.3) * 0.35, sin(camA) * camR);
  vec3 ta = vec3(-0.6, 0.6 + uBass * 0.4, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.6 * fw);

  float dist = 0.0;
  vec2 hit = vec2(100.0, -1.0);
  for (int i = 0; i < 60; i++) {
    if (i >= steps) break;
    vec2 res = mapScene(ro + rd * dist);
    if (res.x < 0.008 * (1.0 + dist * 0.15)) { hit = vec2(dist, res.y); break; }
    dist += res.x * 0.8;
    if (dist > 28.0) break;
  }

  vec3 moonTint = mix(uAccentColour, vec3(1.0), 0.55);
  vec3 color;
  float pattern = 0.0;
  if (hit.y < -0.5) {
    float g = clamp(0.5 - 0.5 * rd.y, 0.0, 1.0);
    color = mix(uBackground * 0.5, uSecondaryColour * 0.4, g);
    float mdot = dot(rd, normalize(MOON_DIR));
    color += moonTint * (smoothstep(0.9993, 0.9997, mdot) * 2.0 + pow(clamp(mdot, 0.0, 1.0), 300.0) * 1.2);
  } else {
    vec3 pos = ro + rd * hit.x;
    vec3 n = calcNormal(pos);
    vec3 ld = normalize(vec3(-0.4, 0.75, 0.5));
    float dif = clamp(dot(n, ld) * 0.5 + 0.5, 0.0, 1.0);
    vec3 hv = normalize(ld - rd);
    float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 70.0) * (0.8 + uTreble * 2.4);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
    float sp = texture(uSpectrum, vec2(clamp(pos.y * 0.2 + 0.45, 0.0, 1.0), 0.5)).r;
    if (hit.y < 0.5) {
      vec3 rf = refract(rd, n, 0.72);
      if (dot(rf, rf) < 0.001) rf = reflect(rd, n);
      vec3 deep = uPrimaryColour * (0.25 + 0.4 * sp) + uBackground * 0.4;
      vec3 glass = mix(deep, palette(clamp(0.5 + rf.y, 0.0, 1.0)), 0.6);
      color = mix(glass, palette(clamp(0.6 + fres, 0.0, 1.0)), fres * 0.85);
      color *= 0.4 + 0.8 * dif;
      // Rainbow film shimmer across the tube.
      vec3 film = palette(clamp(fres * 1.6 + 0.15 + sp * 0.2, 0.0, 1.0));
      color += film * 0.35 * (0.5 + uEnergy * 0.6);
      float back = 1.0 - smoothstep(-2.0, 0.0, pos.z);
      color *= 1.0 - back * 0.45;
      float foamBand = smoothstep(0.4, 0.9, pos.y - uBass * 0.5 + vnoise(pos.xz * 3.0 + t) * 0.7);
      float crash = clamp(kick * 1.8 + uBass * 0.6, 0.0, 1.8);
      color = mix(color, moonTint, foamBand * 0.55 * crash);
      color += uAccentColour * spec;
      pattern = 0.75;
    } else {
      vec3 base = uBackground * 0.9 + uSecondaryColour * 0.25;
      color = base * (0.35 + 0.75 * dif);
      color += uPrimaryColour * spec * 0.5;
      color += base * sp * 0.5;
      // Moon glitter path dancing on the water.
      vec3 r2 = reflect(rd, n);
      float glit = pow(clamp(dot(r2, normalize(MOON_DIR)), 0.0, 1.0), 60.0);
      glit *= 0.5 + 0.5 * vnoise(vec2(pos.x * 2.0, pos.z * 14.0) + t * 0.7);
      color += moonTint * glit * (1.5 + uTreble * 1.5);
      pattern = 0.4;
    }
    float fogF = 1.0 - exp(-hit.x * 0.08);
    color = mix(color, uBackground * 0.6 + uSecondaryColour * 0.1, fogF * 0.6);
  }

  // Mist boiling at the base.
  float mist = vnoise(uv * vec2(3.0, 6.0) + vec2(t * 0.2, 0.0)) * exp(-abs(uv.y + 0.55) * 3.0);
  color += mix(uPrimaryColour, vec3(1.0), 0.3) * mist * (0.25 + uEnergy * 0.3);

  // Spray thrown off the lip.
  float aspect = uResolution.x / uResolution.y;
  for (int i = 0; i < 32; i++) {
    if (i >= spray) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 1.71, 4.2));
    float h2 = hash21(vec2(fi * 0.87, 9.6));
    float fall = fract(h1 + t * (0.25 + h2 * 0.3) * (0.6 + uEnergy * 0.8));
    vec3 pp = vec3(-0.6 + (h2 - 0.5) * 1.6 + fall * 1.8, 3.1 + uBass * 0.9 - fall * fall * 5.2, (h1 - 0.5) * 4.4);
    vec3 vd = pp - ro;
    float along = dot(vd, fw);
    if (along > 0.1) {
      vec2 suv = vec2(dot(vd, rt), dot(vd, up)) / along * 1.6;
      suv.x *= aspect;
      float fade = (1.0 - fall) * smoothstep(0.1, 0.8, along) * (0.4 + uTreble);
      float m = exp(-dot(uv - suv, uv - suv) * 900.0);
      color += mix(uPrimaryColour, uAccentColour, h2) * m * fade * (1.6 + kick * 1.2);
      pattern = max(pattern, m * fade);
    }
  }

  // Glass shards tumbling inside the tube.
  for (int i = 0; i < 14; i++) {
    if (i >= shards) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 2.13, 1.4));
    float h2 = hash21(vec2(fi * 1.07, 5.8));
    vec3 pp = vec3(-1.5 + h1 * 2.0 + sin(t * 0.7 + fi) * 0.2, 0.6 + h2 * 1.9, (hash21(vec2(fi, 3.3)) - 0.5) * 3.6);
    vec3 vd = pp - ro;
    float along = dot(vd, fw);
    if (along > 0.1) {
      vec2 suv = vec2(dot(vd, rt), dot(vd, up)) / along * 1.6;
      suv.x *= aspect;
      float spin = t * 2.5 + fi * 2.1;
      vec2 lp = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * (uv - suv);
      float sz = 0.03 * (3.2 / max(along, 0.5));
      float qb = abs(lp.x) + abs(lp.y) - sz;
      float body = 1.0 - smoothstep(-0.006, 0.006, qb);
      float glint = pow(clamp(1.0 - length(lp) / max(sz, 0.0001), 0.0, 1.0), 2.0) * (0.6 + uTreble * 2.0);
      color += (palette(h1) * body * 0.7 + vec3(1.0) * glint * body) * (0.7 + kick * 0.6);
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
  float vdd = length(uv);
  color *= 1.0 - 0.28 * smoothstep(0.8, 1.7, vdd);
  color *= uMasterBrightness;
  color = aces(color * 1.2);
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
