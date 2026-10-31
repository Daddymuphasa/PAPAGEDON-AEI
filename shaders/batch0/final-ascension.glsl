// Final Ascension (Batch 0): upward tunnel of light toward a bright
// portal, climbing with energy, palette white-out on the drop. Written
// from scratch for this repo; every color comes from u_palette.
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
#define STREAKS 3
#elif AEI_QUALITY == 1
#define STREAKS 6
#else
#define STREAKS 10
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float beatClock = u_time * u_bpm / 60.0;
  vec2 portal = vec2(0.5, 0.72);
  vec2 dvec = (uv - portal) * ar;
  float r = length(dvec);
  float ang = atan(dvec.y, dvec.x);
  float speed = (0.4 + 2.6 * u_energy) * u_p1;
  float shafts = 0.5 + 0.5 * sin(ang * (5.0 + 8.0 * u_p3) + r * 14.0 - t * speed * 3.0);
  shafts = pow(shafts, 2.0 + 3.0 * (1.0 - u_energy));
  float tunnel = exp(-r * (3.5 - 2.0 * u_energy));
  float gate = smoothstep(0.16 + 0.05 * u_bass, 0.0, r) * (0.7 + 0.6 * u_beat);
  float streaks = 0.0;
  for (int i = 0; i < STREAKS; i++) {
    float fi = float(i);
    float h = fract(sin(fi * 91.7) * 4812.3);
    float x = fract(h * 9.0 + sin(t * 0.5 + fi) * 0.02);
    float y = fract(h * 5.0 + t * (0.2 + 0.5 * u_energy) * (0.6 + h));
    float sd = length((uv - vec2(x, y)) * ar);
    streaks += exp(-sd * 90.0) * (0.4 + 0.6 * h);
  }
  streaks *= 0.5 + u_high;
  vec3 col = pal(clamp(0.1 + tunnel * 0.5 + r * 0.3, 0.0, 1.0)) * (0.12 + tunnel * (0.5 + u_bass));
  col += pal(clamp(0.55 + 0.2 * sin(ang * 3.0 + t), 0.0, 1.0)) * shafts * tunnel * (0.4 + 0.8 * u_mid);
  col += pal(0.85) * (gate * 1.6 + streaks * 0.8);
  float flash = smoothstep(0.72, 0.95, u_energy) * (0.45 + 0.55 * u_beat) * (0.6 + 0.4 * u_pulse);
  vec3 flashCol = (u_palette[1] + u_palette[2] + u_palette[3]) / 3.0;
  col += flashCol * flash * 2.2;
  col += pal(0.7) * exp(-abs(r - 0.2 - 0.03 * sin(beatClock * 6.2831)) * 30.0) * 0.5 * u_p2;
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
