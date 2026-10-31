// Shekere Beads (Batch 1): bead grids that rattle and scatter on the
// hi-hats. Written from scratch for this repo; every color comes from
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
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  vec2 grid = vec2(10.0 + u_p1 * 14.0, (10.0 + u_p1 * 14.0) / ar.x);
  vec2 cell = fract(uv * grid);
  vec2 id = floor(uv * grid);
  float h1 = hash21(id);
  float h2 = hash21(id + 17.0);
  float h3 = hash21(id + 41.0);
  float rattle = u_high * 0.45 + u_beat * u_p2 * 0.55;
  vec2 jitter = vec2(h1 - 0.5, h2 - 0.5) * rattle;
  jitter += 0.06 * vec2(sin(t * 30.0 + h3 * 40.0), cos(t * 26.0 + h1 * 40.0)) * u_high;
  float beadR = 0.3 + 0.12 * u_bass + 0.1 * u_beat * h3;
  float bead = 1.0 - smoothstep(beadR * 0.55, beadR, length(cell - 0.5 + jitter));
  float shade = 0.65 + 0.5 * (cell.y + jitter.y);
  vec3 col = pal(0.04) * 0.35;
  col += pal(0.25 + 0.55 * h1) * bead * shade * (0.5 + 0.5 * u_energy + 0.3 * u_mid);
  float rim = smoothstep(beadR * 0.55, beadR, length(cell - 0.5 + jitter));
  rim *= 1.0 - smoothstep(beadR, beadR * 1.25, length(cell - 0.5 + jitter));
  col += pal(0.9) * rim * (0.2 + 0.6 * u_high) * u_p3;
  float stringL = (1.0 - smoothstep(0.0, 0.03, abs(cell.x - 0.5))) * 0.1;
  stringL += (1.0 - smoothstep(0.0, 0.03, abs(cell.y - 0.5))) * 0.1;
  col += pal(0.5) * stringL * (0.3 + 0.4 * u_bass);
#if AEI_QUALITY > 0
  vec2 micro = fract(uv * grid * 3.0);
  float spark = 1.0 - smoothstep(0.02, 0.12, length(micro - 0.5));
  col += pal(0.95) * spark * u_high * 0.5 * step(0.7, h2);
#endif
#if AEI_QUALITY > 1
  float halo = exp(-length(cell - 0.5 + jitter) * 4.0) * bead;
  col += pal(0.6 + 0.3 * h3) * halo * u_beat * 0.5;
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
