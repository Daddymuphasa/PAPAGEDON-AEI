// Molten Dunes (Batch 0): slow lava dunes with glowing cracks, heat haze
// growing with energy. Written from scratch for this repo; every color
// comes from u_palette.
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

#if AEI_QUALITY == 0
#define DUNE_OCT 2
#elif AEI_QUALITY == 1
#define DUNE_OCT 3
#else
#define DUNE_OCT 4
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed * 0.25;
  float beatClock = u_time * u_bpm / 60.0;
  vec2 huv = uv + (vec2(vnoise(uv * 6.0 + t), vnoise(uv * 6.0 + 7.0 - t)) - 0.5) * 0.03 * (0.3 + u_energy);
  vec2 p = huv * ar * 3.0;
  float warp = vnoise(p * 0.8 + t * 0.2);
  float h = 0.0;
  float amp = 0.55;
  float tot = 0.0;
  for (int i = 0; i < DUNE_OCT; i++) {
    float fi = float(i);
    h += amp * vnoise(p * (1.0 + fi * 0.9) + warp * 2.0 + vec2(t * 0.15, -t * 0.1));
    tot += amp;
    amp *= 0.5;
  }
  h /= tot;
  float ridge = 1.0 - abs(h * 2.0 - 1.0);
  ridge = pow(ridge, mix(0.7, 2.0, u_p3));
  vec2 vp = p * (2.0 + u_p1 * 2.0);
  vec2 cell = floor(vp);
  vec2 fv = fract(vp);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(hash21(cell + g), hash21(cell + g + 19.19));
      vec2 r = g + o - fv;
      float d = dot(r, r);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  float crack = 1.0 - smoothstep(0.0, 0.08 + 0.1 * u_bass, sqrt(f2) - sqrt(f1));
  float heat = clamp(u_energy * 0.7 + u_bass * 0.5 + u_beat * 0.4, 0.0, 1.0);
  vec3 rock = pal(clamp(0.05 + h * 0.25 + ridge * 0.1, 0.0, 1.0));
  vec3 lava = pal(clamp(0.55 + heat * 0.4 + u_mid * 0.1, 0.0, 1.0));
  vec3 col = mix(rock * (0.25 + 0.3 * u_p2), lava * (0.6 + 2.2 * heat), crack);
  float sp = step(0.996, hash21(floor(p * 24.0) + floor(t * 8.0) * 0.37)) * u_high;
  col += pal(0.8) * sp * (0.5 + ridge);
  col *= 0.92 + 0.08 * sin(beatClock * 6.2831 + h * 4.0);
  col += pal(0.5) * u_pulse * crack * 0.6;
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
