#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Nano Hex Genesis - PAPAGEDON Signature3D Pack
// Raymarched hexagonal nano-lattice: grows with the bass, rotates with the
// mids, sparkles with the highs, and the camera punches on the kick.
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

// 2D hexagon signed distance, radius r.
float sdHex(vec2 p, float r) {
  vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

// Lattice scene. Returns (distance, material, spectrum): 0 column, 1 floor, 2 core.
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
  float core = length(p - vec3(0.0, 0.6, 0.0)) - (0.9 + kb * 0.6 + uEnergy * 0.2);
  float d = col;
  float mat = 0.0;
  if (floorD < d) { d = floorD; mat = 1.0; }
  if (core < d) { d = core; mat = 2.0; }
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
  uv *= 1.0 - kick * 0.06 - uBass * 0.03;
  float t = uTime * (0.3 + uEnergy * 0.2) * uMotion;
  int steps = int(mix(24.0, 64.0, uDetail));

  float camA = uEvolutionPhase * 0.18 * (0.5 + uMid * 1.4);
  float camR = 6.5 - kick * 0.7 - uBass * 0.4;
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
    vec3 base = palette(clamp(0.25 + 0.5 * sp + pos.y * 0.12, 0.0, 1.0));
    if (mat > 1.5) base = mix(base, uAccentColour, 0.65);
    else if (mat > 0.5) base = uBackground * 1.2 + base * 0.25;
    vec3 ld = normalize(vec3(0.5, 0.8, 0.3));
    float dif = clamp(dot(n, ld) * 0.5 + 0.5, 0.0, 1.0);
    vec3 hv = normalize(ld - rd);
    float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 42.0) * (0.6 + uTreble * 1.6);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
    float ao = clamp(mapScene(pos + n * 0.12).x / 0.12, 0.0, 1.0) * 0.5
             + clamp(mapScene(pos + n * 0.3).x / 0.3, 0.0, 1.0) * 0.5;
    ao = clamp(ao, 0.15, 1.0);
    color = base * (0.25 + 0.9 * dif) * ao;
    color += uAccentColour * spec;
    color += palette(fract(sp + t * 0.05)) * fres * (0.5 + uEnergy);
    if (mat > 1.5) color += uAccentColour * (0.8 + kick * 1.6);
    color += base * sp * uBass * 0.8;
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
