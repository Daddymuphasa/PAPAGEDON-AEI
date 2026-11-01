#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Liquid Mirror - PAPAGEDON Signature3D Pack
// Reflective chrome/liquid surface: ripples with the bass, rings on the
// kick, spectrum light bars in the reflections, treble glints on top.
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

float fbm(vec2 p, int oct) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= oct) break;
    s += a * vnoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s;
}

// Liquid height: swell body plus an expanding kick ring.
float waveH(vec2 p, float t, int oct) {
  float h = fbm(p * 0.7 + vec2(t * 0.12, -t * 0.09), oct) - 0.5;
  float d = length(p);
  float kb = uBeat * uBeat;
  float ring = sin(d * 7.0 - uTime * 7.0) * exp(-d * 0.55) * kb;
  return h * (0.35 + uBass * 0.9) + ring * 0.35;
}

// Procedural environment the chrome reflects.
vec3 envMap(vec3 d, float t) {
  float up = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uBackground * 0.7, uSecondaryColour * 0.5, up);
  float bx = clamp(d.x * 0.5 + 0.5, 0.0, 1.0);
  float sp = texture(uSpectrum, vec2(bx, 0.5)).r;
  col += uAccentColour * sp * up * 1.6;
  col += uPrimaryColour * (0.5 + 0.5 * sin(d.x * 5.0 + t * 0.8 + d.z * 3.0)) * 0.25 * up;
  col += uPrimaryColour * pow(clamp(1.0 - abs(d.y), 0.0, 1.0), 6.0) * 0.6;
  col += uAccentColour * pow(clamp(dot(d, normalize(vec3(0.3, 0.5, -0.6))), 0.0, 1.0), 180.0) * (1.0 + uTreble * 2.0);
  return col;
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  uv *= 1.0 - kick * 0.05 - uBass * 0.03;
  float t = uTime * (0.3 + uEnergy * 0.2) * uMotion;
  int oct = int(mix(2.0, 4.0, uDetail));
  int steps = int(mix(20.0, 48.0, uDetail));

  float camA = uEvolutionPhase * 0.1 * (0.5 + uMid) + t * 0.05;
  vec3 ro = vec3(sin(camA) * 6.0, 1.7 - kick * 0.25, cos(camA) * 6.0);
  vec3 ta = vec3(0.0, -0.3 + uBass * 0.3, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.5 * fw);

  float tt = 0.0;
  float hitT = -1.0;
  for (int i = 0; i < 56; i++) {
    if (i >= steps) break;
    vec3 p = ro + rd * tt;
    float d = p.y - waveH(p.xz, t, oct);
    if (d < 0.012) { hitT = tt; break; }
    tt += clamp(d * 0.7, 0.04, 1.2);
    if (tt > 22.0) break;
  }

  vec3 color;
  if (hitT < 0.0) {
    color = envMap(rd, t);
  } else {
    vec3 p = ro + rd * hitT;
    float e = 0.08;
    float hC = waveH(p.xz, t, oct);
    float hX = waveH(p.xz + vec2(e, 0.0), t, oct);
    float hZ = waveH(p.xz + vec2(0.0, e), t, oct);
    vec3 n = normalize(vec3(hC - hX, e, hC - hZ));
    vec3 r = reflect(rd, n);
    float shim = 0.02 * (0.5 + uTreble);
    r = normalize(r + vec3(sin(p.x * 30.0 + uTime * 9.0) * shim, 0.0, cos(p.z * 26.0 - uTime * 7.0) * shim));
    vec3 mirror = envMap(r, t);
    vec3 rf = refract(rd, n, 0.752);
    if (dot(rf, rf) < 0.001) rf = r;
    vec3 glass = vec3(envMap(rf + vec3(0.012, 0.0, 0.0), t).r, envMap(rf, t).g, envMap(rf - vec3(0.012, 0.0, 0.0), t).b);
    vec3 deep = uBackground * 0.6 + uPrimaryColour * (hC * 0.6 + 0.25);
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    color = mix(mix(deep, glass, 0.55), mirror, fres);
    float crest = smoothstep(0.28, 0.5, hC + uBass * 0.15);
    color = mix(color, mix(uAccentColour, vec3(1.0), 0.4), crest * 0.5);
    color += mirror * kick * 0.4;
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
