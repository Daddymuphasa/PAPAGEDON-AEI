// Glitch Grid (Batch 2): data glitches and pixel tears on snares. Written
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

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * u_speed;
  float snare = clamp(u_beat * 0.6 + u_high * 0.7 + u_pulse * 0.4, 0.0, 1.5);
  float row = floor(uv.y * 48.0);
  float tearSeed = hash21(vec2(row, floor(t * 24.0)));
  float tear = step(1.0 - 0.35 * min(snare, 1.0) * u_p1, tearSeed);
  float shift = (hash21(vec2(row, floor(t * 24.0) + 5.0)) - 0.5) * 0.3 * tear * min(snare, 1.0);
  vec2 guv = vec2(uv.x + shift, uv.y);
  vec2 g = guv * vec2(16.0, 9.0);
  float gx = abs(fract(g.x) - 0.5);
  float gy = abs(fract(g.y) - 0.5);
  float grid = 1.0 - smoothstep(0.0, 0.08, min(gx, gy));
  float cellH = hash21(floor(g));
  vec3 col = pal(0.03) * 0.3;
  col += pal(0.15 + 0.5 * cellH) * (0.2 + 0.3 * u_bass);
  col += pal(0.5 + 0.3 * u_mid) * grid * (0.4 + 0.4 * u_energy);
  float split = tear * 0.012 * min(snare, 1.0);
  float gxR = abs(fract((guv.x + split) * 16.0) - 0.5);
  float gridR = 1.0 - smoothstep(0.0, 0.08, gxR);
  col.r += gridR * tear * 0.6 * u_p2;
  col.b += grid * tear * 0.4 * u_p2;
  float scanTear = 1.0 - smoothstep(0.0, 0.01 + 0.03 * min(snare, 1.0), abs(uv.y - fract(t * 0.7) - 0.0));
  col += pal(0.9) * scanTear * tear * 0.5;
#if AEI_QUALITY > 0
  float blocks = step(0.92 - 0.2 * min(snare, 1.0), hash21(floor(guv * 6.0) + floor(t * 8.0)));
  col = mix(col, pal(cellH), blocks * 0.7 * u_p3);
#endif
#if AEI_QUALITY > 1
  float noise = hash21(floor(guv * u_resolution / 3.0));
  col += (noise - 0.5) * 0.12 * min(snare, 1.0);
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
