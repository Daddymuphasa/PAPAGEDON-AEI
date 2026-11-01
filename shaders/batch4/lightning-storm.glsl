// Lightning Storm (Batch 4): dark clouds with lightning flashes on strong
// beats. Written from scratch for this repo; every color comes from
// u_palette.
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

float hash11(float p) {
  return fract(sin(p * 127.1) * 43758.5453);
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
#define BRANCHES 1
#elif AEI_QUALITY == 1
#define BRANCHES 2
#else
#define BRANCHES 3
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * u_speed;
  float cl = sin(uv.x * 3.0 + t * 0.5) * 0.5 + 0.5;
  cl *= sin(uv.y * 4.0 - t * 0.4 + uv.x * 2.0 + u_bass * 2.0) * 0.5 + 0.5;
  cl = pow(cl, 1.4);
  vec3 col = mix(pal(0.02) * 0.35, pal(0.3 + 0.2 * u_mid) * (0.45 + 0.55 * cl), cl);
  col *= 0.7 + 0.5 * uv.y;
  float strike = max(step(0.72 - 0.25 * u_energy, u_beat), smoothstep(0.7, 0.95, u_bass));
  float lane = 0.2 + 0.6 * hash11(floor(t * 2.0) + 3.0);
  float bolt = 0.0;
  for (int i = 0; i < BRANCHES; i++) {
    float fi = float(i);
    float off = (fi - float(BRANCHES - 1) * 0.5) * 0.09;
    float jag = sin(uv.y * 24.0 + fi * 9.0 + t * 30.0) * 0.02;
    jag += sin(uv.y * 57.0 - fi * 5.0) * 0.008;
    float d = abs(uv.x - lane - off + jag);
    float seg = step(uv.y, 0.85 - fi * 0.12) * step(0.08, uv.y);
    bolt += exp(-d * 90.0) * seg;
  }
  float flash = strike * (0.6 + 0.4 * hash11(floor(t * 24.0)));
  col += pal(0.9) * bolt * flash * 2.2 * u_p1;
  col += pal(0.65) * cl * flash * 0.9 * u_p2;
  col += pal(0.85) * flash * 0.25 * u_p3;
  float rumble = exp(-uv.y * 2.5) * u_bass;
  col += pal(0.4) * rumble * 0.3;
  col += pal(0.5) * exp(-uv.y * 4.0) * (0.12 + 0.25 * u_bass);
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
