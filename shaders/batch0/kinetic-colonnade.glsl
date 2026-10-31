// Kinetic Colonnade (Batch 0): endless raymarched hall of pillars that
// pump, rise and light up in sequence with the beat. Written from
// scratch for this repo; every color comes from u_palette.
precision mediump float;

uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_beat;
uniform float u_energy;
uniform float u_bpm;
uniform float u_intensity;
uniform float u_speed;
uniform float u_pulse;
uniform float u_p1;
uniform float u_p2;
uniform float u_p3;
uniform vec2 u_resolution;
uniform vec3 u_palette[4];
uniform sampler2D u_eventTex;
uniform float u_texMix;
uniform sampler2D u_segMask;
uniform vec4 u_perfBox;
uniform float u_motion;
uniform float u_segMix;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p = p + dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 pal(float t) {
  float x = clamp(t, 0.0, 1.0) * 3.0;
  vec3 c1 = mix(u_palette[0], u_palette[1], clamp(x, 0.0, 1.0));
  vec3 c2 = mix(u_palette[1], u_palette[2], clamp(x - 1.0, 0.0, 1.0));
  vec3 c3 = mix(u_palette[2], u_palette[3], clamp(x - 2.0, 0.0, 1.0));
  if (x < 1.0) return c1;
  if (x < 2.0) return c2;
  return c3;
}

#if AEI_QUALITY == 0
#define MARCH_STEPS 24
#elif AEI_QUALITY == 1
#define MARCH_STEPS 48
#else
#define MARCH_STEPS 72
#endif

float pillarDist(vec2 pr, float rad) {
  return length(pr) - rad;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float beatClock = mod(u_time * u_bpm / 60.0, 32.0);
  float pump = u_bass * (0.6 + 0.4 * u_beat);
  float seq = beatClock * 3.14159 * u_p1;
  float zoff = mod(t * (0.6 + 2.2 * u_energy) * u_p2, 36.0);
  vec3 ro = vec3(sin(t * 0.1) * 0.6, 1.7 + 0.2 * sin(t * 0.23), zoff);
  vec3 ta = vec3(0.0, 1.4, ro.z + 4.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec2 sc = (uv - 0.5) * ar;
  vec3 rd = normalize(sc.x * rt + sc.y * up + 1.4 * fw);
  float dist = 0.0;
  float glow = 0.0;
  float mat = 0.0;
  for (int i = 0; i < MARCH_STEPS; i++) {
    vec3 p = ro + rd * dist;
    float iz = floor((p.z + 3.0) / 6.0);
    vec2 pr = vec2(abs(p.x) - 3.0, mod(p.z + 3.0, 6.0) - 3.0);
    float top = 3.2 + 1.4 * sin(seq - iz * 0.9);
    float rad = 0.55 + pump * 0.3;
    float pillarD = max(pillarDist(pr, rad), p.y - top);
    float d = min(p.y, pillarD);
    glow = 0.5 + 0.5 * sin(seq - iz * 0.9 + 1.57);
    if (d < 0.02) {
      mat = 1.0;
      break;
    }
    dist += d * 0.9;
    if (dist > 40.0) {
      break;
    }
  }
  float fog = exp(-dist * (0.06 + 0.12 * u_p3));
  vec3 hitP = ro + rd * dist;
  vec3 col = pal(0.03) * 0.25 + pal(0.1) * exp(-dist * 0.1) * 0.2;
  if (mat > 0.5) {
    vec2 pr2 = vec2(abs(hitP.x) - 3.0, mod(hitP.z + 3.0, 6.0) - 3.0);
    float pillarD2 = length(pr2) - (0.55 + pump * 0.3);
    float isPillar = step(pillarD2, hitP.y);
    float chase = glow * (0.35 + 1.3 * u_beat + 0.6 * u_pulse);
    vec3 pillarCol = pal(clamp(0.35 + glow * 0.4 + u_mid * 0.2, 0.0, 1.0));
    vec3 floorCol = pal(clamp(0.05 + u_high * 0.1, 0.0, 1.0)) * 0.5;
    floorCol += pal(0.6) * step(0.97, hash21(floor(hitP.xz * 8.0))) * u_high * 0.6;
    vec3 hitCol = mix(floorCol, pillarCol * (0.4 + chase), isPillar);
    hitCol += pal(0.8) * chase * exp(-dist * 0.2) * 0.4 * isPillar;
    col = mix(col, hitCol, fog);
  }
  col *= 0.35 + 0.65 * u_intensity;
  // Shared event-art layer: displaced sample over the shader look (no-op at mix 0).
  float aeiMix = clamp(u_texMix, 0.0, 1.0) * 0.85;
  vec3 aeiGuide = texture2D(u_eventTex, uv).rgb;
  vec2 aeiUv = clamp(uv + (aeiGuide.rg - 0.5) * 0.08 * aeiMix, 0.0, 1.0);
  vec3 aeiArt = texture2D(u_eventTex, aeiUv).rgb;
  col = mix(col, aeiArt * (0.35 + 0.65 * u_intensity), aeiMix);
  // Shared vision layer: performer glow + crowd boost + motion pulse (no-op at mix 0).
  float aeiSegMix = clamp(u_segMix, 0.0, 1.0);
  vec2 aeiSeg = texture2D(u_segMask, uv).rg;
  vec2 aeiSp = vec2(uv.x, 1.0 - uv.y);
  vec2 aeiB1 = u_perfBox.xy + u_perfBox.zw;
  float aeiHasBox = step(0.0001, u_perfBox.z * u_perfBox.w);
  vec2 aeiDb = max(max(u_perfBox.xy - aeiSp, aeiSp - aeiB1), vec2(0.0));
  float aeiEdge = (1.0 - smoothstep(0.0, 0.035, length(aeiDb))) * aeiHasBox;
  float aeiIn = step(u_perfBox.x, aeiSp.x) * step(aeiSp.x, aeiB1.x) * step(u_perfBox.y, aeiSp.y) * step(aeiSp.y, aeiB1.y) * aeiHasBox;
  vec3 aeiGlow = (u_palette[0] + u_palette[1]) * 0.5;
  col += aeiGlow * (aeiEdge * 0.5 + aeiIn * aeiSeg.r * 0.35) * aeiSegMix;
  col *= 1.0 + aeiSeg.g * 0.35 * aeiSegMix;
  col *= 1.0 + clamp(u_motion, 0.0, 1.0) * aeiSegMix * 0.12 * (0.5 + 0.5 * sin(u_time * 6.0));
  gl_FragColor = vec4(col, 1.0);
}
