#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Glass Tsunami - PAPAGEDON Signature3D Pack
// A towering refractive glass wave about to break: rises with the bass,
// circles with the mids, throws spray that sparkles with the highs.
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

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Breaking wave: a curling tube blended into a rising wall over water.
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
  uv *= 1.0 - kick * 0.06 - uBass * 0.03;
  float t = uTime * (0.35 + uEnergy * 0.2) * uMotion;
  int steps = int(mix(20.0, 48.0, uDetail));
  int spray = int(mix(10.0, 30.0, uDetail));

  float camA = uEvolutionPhase * 0.1 * (0.5 + uMid) - 0.5;
  float camR = 7.2 - kick * 0.6 - uBass * 0.4;
  vec3 ro = vec3(2.5 + cos(camA) * 2.0, 1.4 + sin(t * 0.3) * 0.4, sin(camA) * camR);
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

  vec3 color;
  if (hit.y < -0.5) {
    float g = clamp(0.5 - 0.5 * rd.y, 0.0, 1.0);
    color = mix(uBackground * 0.5, uSecondaryColour * 0.4, g);
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
      float foamBand = smoothstep(0.4, 0.9, pos.y - uBass * 0.5 + vnoise(pos.xz * 3.0 + t) * 0.7);
      float crash = clamp(kick * 1.5 + uBass * 0.5, 0.0, 1.5);
      color = mix(color, mix(uAccentColour, vec3(1.0), 0.5), foamBand * 0.55 * crash);
      color += uAccentColour * spec;
    } else {
      vec3 base = uBackground * 0.9 + uSecondaryColour * 0.25;
      color = base * (0.35 + 0.75 * dif);
      color += uPrimaryColour * spec * 0.5;
      color += base * sp * 0.5;
    }
  }

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
      color += mix(uPrimaryColour, uAccentColour, h2) * m * fade * 1.6;
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
  float vdd = length(uv);
  color *= 1.0 - 0.3 * smoothstep(0.85, 1.7, vdd);
  color *= uMasterBrightness;
  color = aces(color * 1.15);
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
