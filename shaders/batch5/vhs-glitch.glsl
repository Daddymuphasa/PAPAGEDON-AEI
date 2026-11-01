// VHS Glitch (Batch 5): scanlines, colour bleed and tracking wobble on
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

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * u_speed;
  float trackY = fract(t * 0.23);
  float trackBand = exp(-abs(uv.y - trackY) * 22.0);
  float wobble = (hash11(floor(t * 30.0)) - 0.5) * 0.06 * trackBand * (0.4 + u_beat);
  wobble += sin(uv.y * 90.0 + t * 20.0) * 0.002 * (1.0 + 2.0 * u_beat * u_p1);
  vec2 vuv = vec2(fract(uv.x + wobble), uv.y);
  float bars = sin(vuv.x * 9.0 + t * 0.7) * sin(vuv.y * 7.0 - t * 0.5 + u_mid * 3.0);
  vec3 col = mix(pal(0.08), pal(0.4 + 0.3 * u_energy), smoothstep(-0.6, 0.8, bars));
  float bleed = 0.006 + 0.02 * u_beat * u_p2;
  float barsR = sin((vuv.x + bleed) * 9.0 + t * 0.7) * sin(vuv.y * 7.0 - t * 0.5 + u_mid * 3.0);
  float barsB = sin((vuv.x - bleed) * 9.0 + t * 0.7) * sin(vuv.y * 7.0 - t * 0.5 + u_mid * 3.0);
  col.r = mix(pal(0.08).r, pal(0.4 + 0.3 * u_energy).r, smoothstep(-0.6, 0.8, barsR));
  col.b = mix(pal(0.08).b, pal(0.4 + 0.3 * u_energy).b, smoothstep(-0.6, 0.8, barsB));
  float scan = 0.5 + 0.5 * sin(uv.y * u_resolution.y * 1.4);
  col *= 1.0 - scan * (0.12 + 0.1 * u_high);
  col += pal(0.9) * trackBand * (0.15 + 0.5 * u_beat) * u_p3;
  float noise = hash11(floor(uv.y * 240.0) + floor(t * 24.0) * 57.0);
  col += (noise - 0.5) * 0.08 * (0.3 + 0.7 * u_high);
#if AEI_QUALITY > 0
  float tear = step(0.985 - 0.1 * u_beat, hash11(floor(t * 12.0)));
  col = mix(col, col.brg, tear * 0.7 * trackBand);
#endif
#if AEI_QUALITY > 1
  float vign = smoothstep(0.95, 0.45, length((uv - 0.5) * vec2(1.4, 1.0)));
  col *= mix(0.7, 1.0, vign);
#endif
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
