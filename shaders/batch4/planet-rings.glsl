// Planet Rings (Batch 4): a tilted ringed planet, ring shimmer on u_high.
// Written from scratch for this repo; every color comes from u_palette.
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
  vec2 c = (uv - vec2(0.5, 0.52)) * ar;
  float tilt = 0.42 + 0.1 * sin(t * 0.3);
  float pr = 0.24 + 0.02 * u_bass;
  float pd = length(c);
  float planet = 1.0 - smoothstep(pr * 0.96, pr, pd);
  float bands = sin(c.y * 22.0 + sin(c.x * 9.0 + t * 0.6) * 1.5 + u_mid * 3.0) * 0.5 + 0.5;
  vec3 col = pal(0.02) * 0.25;
  vec2 scell = floor(uv * vec2(100.0, 60.0));
  col += pal(0.85) * step(0.988, hash21(scell)) * 0.7;
  vec3 surf = mix(pal(0.25), pal(0.5 + 0.2 * u_energy), bands);
  float shade = clamp(dot(normalize(vec3(c, 0.4)), normalize(vec3(-0.6, 0.5, 0.6))), 0.15, 1.0);
  col = mix(col, surf * shade, planet);
  vec2 rp = vec2(c.x, (c.y + (c.x) * tilt) * 3.2);
  float rr = length(rp);
  float rings = smoothstep(pr * 1.05, pr * 1.25, rr) * (1.0 - smoothstep(pr * 2.1, pr * 2.4, rr));
  float ringBands = 0.5 + 0.5 * sin(rr * 60.0 + t * (0.5 + u_high * 2.0));
  float front = step(c.y + c.x * tilt, 0.0);
  float ringVis = rings * mix(1.0, 1.0 - planet, front);
  col = mix(col, pal(0.6) * (0.5 + 0.5 * ringBands) * (0.6 + 0.6 * u_high), ringVis * 0.85 * u_p1);
  col += pal(0.9) * ringVis * ringBands * u_high * 0.5 * u_p2;
  float glow = exp(-abs(pd - pr * 1.7) * 5.0);
  col += pal(0.45) * glow * 0.25 * (0.4 + 0.6 * u_mid) * u_p3;
  col += pal(0.7) * planet * u_beat * 0.15;
#if AEI_QUALITY > 0
  float moon = length(c - vec2(0.42 * sin(t * 0.4), 0.3));
  col += pal(0.8) * (1.0 - smoothstep(0.02, 0.035, moon)) * 0.8;
#endif
#if AEI_QUALITY > 1
  col += pal(0.95) * ringVis * pow(ringBands, 6.0) * u_high;
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
