#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Nebula Forge - PAPAGEDON Signature3D Pack
// A particle nebula being forged into glowing filaments: seams brighten
// with the bass, the whole cloud swirls with the mids, kicks fire shock
// rings through the dust.
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
    p = p * 2.04 + vec2(3.1, 7.7);
    a *= 0.5;
  }
  return s;
}

float ridged(vec2 p, int oct) {
  float s = 0.0;
  float a = 0.55;
  for (int i = 0; i < 5; i++) {
    if (i >= oct) break;
    s += a * (1.0 - abs(vnoise(p) * 2.0 - 1.0));
    p = p * 2.13 + vec2(5.2, 1.3);
    a *= 0.5;
  }
  return s;
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  uv *= 1.0 - kick * 0.06 - uBass * 0.03;
  float t = uTime * (0.25 + uEnergy * 0.2) * uMotion;
  int oct = int(mix(2.0, 4.0, uDetail));
  int stars = int(mix(24.0, 60.0, uDetail));
  float aspect = uResolution.x / uResolution.y;

  // Slow domain swirl, faster with the mids.
  float r0 = length(uv);
  float swirl = t * 0.12 * (0.4 + uMid * 1.6) / max(r0 + 0.35, 0.001);
  float cs = cos(swirl);
  float sn = sin(swirl);
  vec2 w = mat2(cs, -sn, sn, cs) * uv;

  float body = fbm(w * 1.4 + vec2(t * 0.05, -t * 0.04), oct);
  float fil = ridged(w * 2.2 - vec2(t * 0.07, t * 0.05), oct);
  vec3 color = uBackground * (0.35 + 0.4 * body);
  color += palette(clamp(body * 1.1, 0.0, 1.0)) * body * (0.5 + uEnergy * 0.6);
  float seam = pow(clamp(fil - (0.72 - uBass * 0.22 - uEnergy * 0.12), 0.0, 1.0) * 2.2, 2.0);
  vec3 seamCol = mix(uPrimaryColour, uAccentColour, clamp(uBass + kick * 0.7, 0.0, 1.0));
  color += seamCol * seam * (0.8 + uBass * 1.6 + kick * 1.4);

  // Shock ring racing out after each kick.
  float rr = length(uv);
  float ringR = (1.0 - kick) * 2.6 + 0.15;
  float ring = exp(-pow((rr - ringR) * 5.0, 2.0)) * kick;
  color += uAccentColour * ring * 1.2;

  // Drifting forge sparks.
  for (int i = 0; i < 64; i++) {
    if (i >= stars) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 1.31, 2.9));
    float h2 = hash21(vec2(fi * 0.77, 8.4));
    float h3 = hash21(vec2(fi * 1.93, 5.1));
    vec2 suv = vec2((h1 - 0.5) * 3.4, (h2 - 0.5) * 2.4 + sin(t * (0.4 + h3) + fi) * 0.12);
    suv.x *= aspect;
    float dep = 0.4 + h3 * 0.6;
    float sp = texture(uSpectrum, vec2(fract(h1 * 3.0 + h2), 0.5)).r;
    float tw = 0.5 + 0.5 * sin(uTime * (2.0 + uTreble * 9.0) + fi * 17.3);
    float m = exp(-dot(uv - suv, uv - suv) / max(0.00012 * dep, 0.00001));
    color += palette(h3) * m * (0.3 + sp * 1.5 + uTreble * 0.6) * tw;
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
