// Crystal Chandelier (Batch 3): sparkling crystal refractions on the
// highs, hanging tiers swaying softly. Written from scratch for this
// repo; every color comes from u_palette.
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
  vec3 col = pal(0.02) * 0.25;
  float tiers = 3.0;
  for (float tier = 0.0; tier < 3.0; tier += 1.0) {
    float ty = 0.72 - tier * 0.2;
    float sway = sin(t * (0.8 + tier * 0.3) + tier * 2.0) * 0.02 * (0.5 + u_bass);
    float n = 6.0 + tier * 4.0;
    float fx = fract(uv.x * n + sway * 10.0 + tier * 0.5) - 0.5;
    float fy = (uv.y - ty) / 0.09;
    float gem = length(vec2(fx * (1.0 + abs(fy)), fy));
    float facet = abs(fract((fx + fy) * 3.0 + t * 0.5 + tier) - 0.5);
    float crystal = exp(-gem * 4.0);
    float tw = 0.5 + 0.5 * sin(t * (5.0 + tier * 2.0) + uv.x * 40.0 + u_high * 8.0);
    vec3 tint = pal(0.55 + 0.3 * (tier / tiers) + 0.1 * facet);
    col += tint * crystal * (0.4 + 0.6 * tw) * (0.5 + 0.5 * u_mid + 0.3 * u_p1);
    col += pal(0.95) * exp(-gem * 9.0) * tw * u_high * u_p2;
    float chain = (1.0 - smoothstep(0.0, 0.012, abs(fx))) * step(abs(fy), 2.2) * step(0.4, gem);
    col += pal(0.4) * chain * 0.3 * (0.4 + 0.6 * u_bass);
  }
  float haze = exp(-length((uv - vec2(0.5, 0.6)) * ar) * 2.0);
  col += pal(0.7) * haze * 0.25 * (0.4 + 0.6 * u_energy) * u_p3;
#if AEI_QUALITY > 0
  float spark = pow(hash21(floor(uv * 90.0) + floor(t * 3.0)), 10.0);
  col += pal(0.98) * spark * u_high * 2.5;
#endif
#if AEI_QUALITY > 1
  float rays = 0.5 + 0.5 * sin(atan(uv.y - 0.55, (uv.x - 0.5) * ar.x) * 24.0);
  col += pal(0.8) * rays * haze * u_beat * 0.4;
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
