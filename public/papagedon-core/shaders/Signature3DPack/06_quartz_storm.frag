#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
// Quartz Storm - PAPAGEDON Signature3D Pack
// Shattered quartz shards orbiting in a 3D storm: the swarm breathes with
// the bass, whirls with the mids, and every shard glints with the highs.
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

// Rounded box distance in 2D.
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float kick = uBeat * uBeat;
  uv *= 1.0 - kick * 0.05 - uBass * 0.02;
  float t = uTime * (0.4 + uEnergy * 0.25) * uMotion;
  int count = int(mix(14.0, 40.0, uDetail));
  float aspect = uResolution.x / uResolution.y;

  float g = clamp(0.5 - 0.5 * uv.y * 0.5, 0.0, 1.0);
  vec3 color = uBackground * (0.35 + 0.65 * g);
  vec2 sg = uv * 2.5;
  float st = hash21(floor(sg));
  float star = smoothstep(0.986, 1.0, st) * (0.3 + uTreble * 0.7);
  color += uPrimaryColour * star * 0.7;

  float whirl = t * (0.5 + uMid * 1.6) + uEvolutionPhase * 0.2;
  float breathe = 1.0 + uBass * 0.3 + kick * 0.2;
  float camA = uEvolutionPhase * 0.1 * (0.5 + uMid);
  float ca = cos(camA);
  float sa = sin(camA);

  for (int i = 0; i < 44; i++) {
    if (i >= count) break;
    float fi = float(i);
    float h1 = hash21(vec2(fi * 1.37, 7.1));
    float h2 = hash21(vec2(fi * 2.11, 3.7));
    float h3 = hash21(vec2(fi * 0.93, 11.3));
    float ang = h1 * 6.2831853 + whirl * (0.6 + h2 * 0.8);
    float rad = (0.5 + h2 * 1.6) * breathe;
    vec3 pp = vec3(cos(ang) * rad, (h3 - 0.5) * 2.2 + sin(t * 0.8 + fi) * 0.3, sin(ang) * rad);
    pp.xz = mat2(ca, -sa, sa, ca) * pp.xz;
    float persp = 3.4 / max(pp.z + 3.6, 0.5);
    vec2 suv = vec2(pp.x * persp, pp.y * persp * 0.8);
    suv.x *= aspect;
    float spin = t * (1.0 + h1 * 2.0) * (0.5 + uMid) + fi * 2.4;
    float cs = cos(spin);
    float sn = sin(spin);
    vec2 lp = mat2(cs, -sn, sn, cs) * (uv - suv);
    float sz = (0.05 + h3 * 0.075) * persp * (1.0 + kick * 0.35);
    float d = sdRoundBox(lp, vec2(sz * (0.6 + h2 * 0.7), sz * 0.42), sz * 0.12);
    float body = smoothstep(0.012, -0.012, d);
    if (body > 0.001) {
      float sp = texture(uSpectrum, vec2(fract(h1 + h2 * 0.5), 0.5)).r;
      vec3 base = palette(clamp(h2 * 0.7 + sp * 0.5, 0.0, 1.0));
      float shade = clamp(0.45 + 0.55 * (lp.y / max(sz, 0.0001) * 0.5 + 0.5), 0.0, 1.0);
      float rim = smoothstep(0.02, 0.0, abs(d)) * 0.8;
      float glint = pow(clamp(1.0 - length(lp - vec2(-sz * 0.3, sz * 0.15)) / max(sz, 0.0001), 0.0, 1.0), 3.0);
      glint *= 0.5 + uTreble * 2.2;
      vec3 scol = base * shade + uAccentColour * (rim * 0.5 + glint);
      scol += base * sp * uBass * 0.7;
      float alpha = body * clamp(persp * 0.75, 0.25, 1.0);
      color = mix(color, scol, alpha);
    }
  }

  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  float sat = clamp(uSaturationBase + 0.25 + uIntensity * uSaturationScale, 0.0, 1.3);
  color = mix(vec3(luma), color, sat);
  color *= (0.5 + uEnergy * 0.9) * uMasterExposure;
  color += uBackground * 0.2;
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
