// Authoring template for M6 shaders. Copy to shaders/pack/<name>.glsl,
// add a <name>.ts that imports it and calls registerShader().
//
// Required uniforms (set every frame by src/engine/renderer.ts):
//   uniform float u_time;       // seconds since start
//   uniform float u_bass;       // 0-1 bass energy
//   uniform float u_mid;        // 0-1 mid energy
//   uniform float u_high;       // 0-1 high energy
//   uniform float u_beat;       // 1 on beat frames, else 0
//   uniform float u_intensity;  // 0-1 director intensity
//   uniform vec2  u_resolution; // canvas size in px
//   uniform vec3  u_palette[4]; // EventTheme palette as linear RGB
//
// Rules: GLSL ES 1.00, precision mediump float, no textures in M1
// (Muse Image textures arrived in M7 as u_eventTex + u_texMix;
// segmentation masks arrived in M8 as u_segMask + u_perfBox + u_segMix (+ u_motion
// for crowd motion, renamed from u_crowdMotion in M9-B).
precision mediump float;

uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_beat;
uniform float u_intensity;
uniform vec2 u_resolution;
uniform vec3 u_palette[4];

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 col = mix(u_palette[0], u_palette[1], uv.x);
  gl_FragColor = vec4(col, 1.0);
}
