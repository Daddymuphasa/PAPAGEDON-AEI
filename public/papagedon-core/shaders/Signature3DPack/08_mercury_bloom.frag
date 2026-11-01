#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Mercury Bloom - PAPAGEDON Signature3D Pack
// Liquid-metal flower reborn: twin petal layers, glowing veins, drifting
// pollen, light blades in the heart, dew sparkle, and a god-ray crown.
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

float foldPetal(vec3 p, float open, float phase, float size, float lift) {
  float an = atan(p.z, p.x);
  float sec = 6.2831853 / 8.0;
  float fa = mod(an + phase, sec) - sec * 0.5;
  float rad = length(p.xz);
  vec2 fp = vec2(cos(fa) * rad, sin(fa) * rad);
  float lean = (fp.y + 0.6) * open;
  vec3 bud = vec3(fp.x - 0.9 * open * size, p.y - lift - lean * 0.55, fp.y * 0.8);
  return length(bud / vec3(1.0, 0.55, 0.6)) - 0.75 * size;
}

// Returns (distance, material): 0 petal, 1 heart, 2 floor.
vec3 mapScene(vec3 p) {
  float rotA = uEvolutionPhase * 0.2 * (0.4 + uMid * 1.1);
  float ca = cos(rotA);
  float sa = sin(rotA);
  p.xz = mat2(ca, -sa, sa, ca) * p.xz;
  float kb = uBeat * uBeat;
  float open = 0.55 + uEnergy * 0.5 + kb * 0.25;
  float outer = foldPetal(p, open, 0.0, 1.0, 0.5);
  float inner = foldPetal(p, open * 0.8, 0.3927, 0.55, 0.85);
  float petal = smin(outer, inner, 0.3);
  float heart = length(p - vec3(0.0, 0.5, 0.0)) - (0.42 + uBass * 0.18 + kb * 0.2);
  float flower = smin(petal, heart, 0.35);
  float floorD = p.y + 1.4;
  float d = flower;
  float mat = 0.0;
  if (heart < d - 0.05) { mat = 1.0; }
  if (floorD < d) { d = floorD; mat = 2.0; }
  else { d = flower; }
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
  int steps = int(mix(24.0, 56.0, uDetail));
  int motes = int(mix(10.0, 24.0, uDetail));

  float camA = uEvolutionPhase * 0.14 * (0.5 + uMid * 1.2) + 2.2;
  float camR = 6.0 - kick * 0.8 - uBass * 0.4;
  vec3 ro = vec3(cos(camA) * camR, 2.1 + sin(t * 0.35) * 0.45, sin(camA) * camR);
  vec3 ta = vec3(0.0, 0.2, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.6 * fw);

  float dist = 0.0;
  vec2 hit = vec2(100.0, -1.0);
  for (int i = 0; i < 70; i++) {
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
    float st = hash21(floor(suv * 21.0));
    float star = smoothstep(0.983, 1.0, st) * (0.35 + uTreble * 0.9);
    color += uPrimaryColour * star * 0.8;
  } else {
    vec3 pos = ro + rd * hit.x;
    float mat = hit.y;
    vec3 n = calcNormal(pos);
    vec3 ld = normalize(vec3(0.4, 0.8, 0.45));
    float dif = clamp(dot(n, ld) * 0.5 + 0.5, 0.0, 1.0);
    vec3 hv = normalize(ld - rd);
    float spec = pow(clamp(dot(n, hv), 0.0, 1.0), 56.0) * (0.7 + uTreble * 2.2);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.5);
    float sp = texture(uSpectrum, vec2(clamp(pos.y * 0.25 + 0.4, 0.0, 1.0), 0.5)).r;
    if (mat < 0.5) {
      vec3 base = palette(clamp(0.3 + 0.5 * sp + pos.y * 0.1, 0.0, 1.0));
      vec3 mirror = palette(clamp(0.5 + 0.5 * dot(reflect(rd, n), ld), 0.0, 1.0));
      color = base * (0.3 + 0.8 * dif) + mirror * fres * 0.9;
      color += uAccentColour * spec;
      color += base * sp * uBass * 0.8;
      // Glowing veins across the petals.
      float vein = smoothstep(0.68, 0.95, vnoise(pos.xy * 4.0 + pos.zx * 2.0 + t * 0.2));
      color += uAccentColour * vein * (0.4 + uEnergy * 0.8 + sp * 0.5);
      // Translucent backlight on thin petal edges.
      float backl = pow(clamp(dot(-rd, ld), 0.0, 1.0), 2.0) * fres;
      color += uAccentColour * backl * (0.6 + kick);
      // Dew sparkle on the rims.
      color += vec3(1.0) * fres * spec * (0.5 + uTreble * 2.0);
      pattern = 0.6;
    } else if (mat < 1.5) {
      vec3 heartCol = mix(uPrimaryColour, uAccentColour, clamp(sp + uEnergy * 0.5, 0.0, 1.0));
      color = heartCol * (1.3 + kick * 2.4 + uBass);
      // Rotating light blades inside the heart.
      float bl = pow(0.5 + 0.5 * sin(atan(pos.z, pos.x) * 8.0 + t * 2.5), 8.0);
      color += uAccentColour * bl * (1.0 + kick * 2.0);
      pattern = 0.95;
    } else {
      vec3 base = uBackground * 1.3 + uSecondaryColour * 0.18;
      color = base * (0.3 + 0.7 * dif);
      // Ripple rings racing out on every kick.
      float fr = length(pos.xz);
      float r1 = exp(-pow((fr - ((1.0 - kick) * 7.0 + 0.2)) * 1.6, 2.0)) * kick;
      float r2 = exp(-pow((fr - fract(t * 0.3) * 7.0) * 1.6, 2.0)) * (1.0 - fract(t * 0.3)) * 0.4;
      color += uPrimaryColour * (r1 * 1.4 + r2 * (0.4 + uEnergy * 0.5));
      pattern = 0.3;
    }
    float fogF = 1.0 - exp(-hit.x * 0.1);
    color = mix(color, uBackground * 0.7 + uPrimaryColour * 0.08 * uEnergy, fogF * 0.7);
  }

  // God-ray crown above the heart.
  vec3 heartW = vec3(0.0, 0.5, 0.0);
  vec3 hv2 = heartW - ro;
  float ha = dot(hv2, fw);
  if (ha > 0.1) {
    vec2 hsuv = vec2(dot(hv2, rt), dot(hv2, up)) / ha * 1.6;
    hsuv.x *= uResolution.x / uResolution.y;
    float beam = exp(-pow((uv.x - hsuv.x) * 2.6, 2.0)) * (1.0 - smoothstep(hsuv.y, hsuv.y + 1.6, uv.y));
    beam *= smoothstep(hsuv.y - 0.2, hsuv.y + 0.15, uv.y);
    color += uAccentColour * beam * (0.25 + uEnergy * 0.4 + kick * 0.5);
    pattern = max(pattern, beam * 0.4);
  }

  // Drifting pollen motes.
  for (int i = 0; i < 26; i++) {
    if (i >= motes) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 1.29, 3.3));
    float h2 = hash21(vec2(fi * 0.83, 7.9));
    float h3 = hash21(vec2(fi * 1.97, 1.7));
    vec3 pp = vec3((h1 - 0.5) * 7.0 + sin(t * 0.5 + fi) * 0.4, 0.2 + h2 * 3.0 + sin(t * 0.4 + fi * 2.0) * 0.3, (h3 - 0.5) * 7.0);
    vec3 vd = pp - ro;
    float along = dot(vd, fw);
    if (along > 0.1) {
      vec2 suv = vec2(dot(vd, rt), dot(vd, up)) / along * 1.6;
      suv.x *= uResolution.x / uResolution.y;
      float tw = 0.5 + 0.5 * sin(uTime * (2.0 + uTreble * 8.0) + fi * 13.7);
      float m = exp(-dot(uv - suv, uv - suv) * 1400.0);
      color += mix(uPrimaryColour, uAccentColour, h3) * m * (0.4 + tw * (0.5 + uTreble));
      pattern = max(pattern, m * 0.5);
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
