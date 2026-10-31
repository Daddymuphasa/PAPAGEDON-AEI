// Masquerade Spirit (Batch 1): abstract mask-like symmetric forms morphing
// on beats. Pure abstraction — ovals, spikes, rings — no faces. Written
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
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float beatClock = u_time * u_bpm / 60.0;
  vec2 p = vec2(abs(uv.x - 0.5) * ar.x, uv.y - 0.5);
  float morph = clamp(u_beat * 0.8 + 0.3 + 0.3 * sin(t * 0.7), 0.0, 1.0);
  vec2 q = p * (2.2 + u_p1);
  float w1 = sin(q.y * 2.0 + t) * 0.3 + sin((q.x + q.y) * 1.5 - t * 0.7) * 0.2;
  float w2 = sin(length(q) * 4.0 - beatClock * 3.14159) * 0.35 + sin(q.x * 3.0 + t * 1.2) * 0.15;
#if AEI_QUALITY > 0
  w1 += sin(q.x * 5.0 - q.y * 3.0 + u_mid * 4.0) * 0.12;
  w2 += sin(q.y * 6.0 + q.x * 2.0 - t) * 0.1;
#endif
#if AEI_QUALITY > 1
  w1 += sin(length(q * vec2(1.0, 2.0)) * 9.0 + t * 1.5) * 0.06;
#endif
  float warp = mix(w1, w2, morph);
  float body = length(vec2(p.x * (1.0 + warp * 0.4), p.y * (1.3 - warp * 0.3)));
  float oval = 1.0 - smoothstep(0.18, 0.3 + 0.12 * u_bass, body);
  float ang = atan(p.y, p.x + 0.001);
  float spikes = 0.5 + 0.5 * sin(ang * 9.0 + t * (0.5 + u_energy));
  float crown = (1.0 - smoothstep(0.3, 0.55, body)) * smoothstep(0.6, 0.95, spikes);
  float haloR = abs(body - 0.42 - 0.06 * sin(t * 2.0));
  float halo = 1.0 - smoothstep(0.0, 0.03, haloR);
  vec3 col = pal(0.03) * 0.3;
  col = mix(col, pal(0.3 + 0.3 * morph), oval);
  col += pal(0.6 + 0.2 * u_energy) * crown * (0.5 + 0.7 * u_mid) * u_p2;
  col += pal(0.85) * halo * (0.3 + 0.7 * u_beat);
  col += pal(0.95) * oval * crown * u_high * u_p3;
  col += pal(0.15) * exp(-body * 5.0) * 0.5;
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
