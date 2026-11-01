#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Crystal Throne - PAPAGEDON Signature3D Pack
// A giant rotating refractive crystal on a pedestal: flat facets catch the
// light, the inner core burns with the bass and flares on the kick.
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

float sdOcta(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

// Returns (distance, material): 0 crystal, 1 pedestal, 2 glow ring.
vec3 mapScene(vec3 p) {
  float rotA = uEvolutionPhase * 0.25 * (0.3 + uMid * 0.9);
  float ca = cos(rotA);
  float sa = sin(rotA);
  p.xz = mat2(ca, -sa, sa, ca) * p.xz;
  float kb = uBeat * uBeat;
  float grow = 1.0 + uBass * 0.12 + kb * 0.1;
  float cry = sdOcta((p - vec3(0.0, 1.15, 0.0)) / grow, 1.2) * grow;
  vec2 dc = vec2(length(p.xz) - 1.3, abs(p.y + 1.05) - 0.25);
  float ped = min(max(dc.x, dc.y), 0.0) + length(max(dc, vec2(0.0)));
  vec2 tq = vec2(length(p.xz) - 1.75, p.y + 0.55);
  float ring = length(tq) - 0.1;
  float d = cry;
  float mat = 0.0;
  if (ped < d) { d = ped; mat = 1.0; }
  if (ring < d) { d = ring; mat = 2.0; }
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
  int steps = int(mix(24.0, 64.0, uDetail));

  float camA = uEvolutionPhase * 0.15 * (0.5 + uMid * 1.2);
  float camR = 6.2 - kick * 0.6 - uBass * 0.3;
  vec3 ro = vec3(cos(camA) * camR, 1.6 + sin(t * 0.4) * 0.4, sin(camA) * camR);
  vec3 ta = vec3(0.0, 0.5, 0.0);
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
    if (dist > 25.0) break;
  }

  vec3 color;
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
    } else if (mat < 1.5) {
      vec3 base = uBackground * 1.4 + uSecondaryColour * 0.2;
      color = base * (0.3 + 0.8 * dif);
      color += uPrimaryColour * spec * 0.4;
    } else {
      vec3 ringCol = palette(clamp(0.55 + 0.45 * sp, 0.0, 1.0));
      color = ringCol * (1.2 + uBass * 1.2 + kick * 2.0);
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
