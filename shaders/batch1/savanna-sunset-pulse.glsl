// Savanna Sunset Pulse (Batch 1): layered sunset bands with silhouetted
// grass swaying to bass. Written from scratch for this repo; every color
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
#define BLADES 28.0
#elif AEI_QUALITY == 1
#define BLADES 56.0
#else
#define BLADES 110.0
#endif

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 ar = vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed;
  float bands = 5.0 + floor(u_p1 * 3.0);
  float bandId = floor(uv.y * bands);
  float bandEdge = smoothstep(0.0, 0.06, abs(fract(uv.y * bands) - 0.5) - 0.44);
  vec3 col = pal(clamp(uv.y * 0.75 + 0.05 * bandId / bands, 0.0, 1.0));
  col += pal(0.85) * bandEdge * 0.25 * (0.4 + 0.6 * u_mid);
  vec2 sunP = vec2(0.5, 0.46);
  float sd = length((uv - sunP) * ar);
  float sunR = 0.13 + 0.05 * u_bass + 0.03 * u_beat;
  float sun = 1.0 - smoothstep(sunR * 0.9, sunR, sd);
  col = mix(col, pal(0.72), sun);
  col += pal(0.65) * exp(-sd * 4.5) * (0.35 + 0.4 * u_bass);
  float groundLine = 0.3;
  float bx = uv.x * BLADES;
  float n = hash11(floor(bx));
  float hgt = 0.1 + 0.2 * n * (0.7 + 0.3 * u_p2);
  float sway = sin(t * 2.0 + bx * 0.35) * 0.02 * (0.3 + u_bass);
  float top = groundLine - hgt * smoothstep(0.32, 0.05, abs(fract(bx) - 0.5));
  float blade = 1.0 - smoothstep(top - 0.008, top + 0.008, uv.y + sway);
  float ground = 1.0 - smoothstep(groundLine - 0.004, groundLine + 0.004, uv.y);
  float silhouette = max(blade * step(uv.y, groundLine + 0.02), ground);
  col = mix(col, pal(0.02) * 0.18, silhouette);
  float birdY = 0.72 + 0.04 * sin(t * 0.6);
  float birds = (1.0 - smoothstep(0.002, 0.008, abs(uv.y - birdY))) * step(0.2, fract(uv.x * 3.0 + t * 0.05)) * step(fract(uv.x * 3.0 + t * 0.05), 0.5);
  col += pal(0.9) * birds * u_high * u_p3 * 0.6;
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
