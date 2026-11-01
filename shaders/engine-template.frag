// Authoring template for engine shaders (human reference — the runtime
// adapter adds the ES 3.00 header, so no #version line here).
//
// Interface (exactly):
//   in vec2 vUV;          // 0..1 fullscreen coordinate
//   out vec4 fragColor;   // final colour
//
// Available uniforms (all set every frame by PapagedonRenderer):
//   float uTime, uEnergy, uIntensity, uBass, uMid, uTreble, uBeat, uMood;
//   vec2 uResolution;
//   vec3 uPrimaryColour, uSecondaryColour, uAccentColour, uBackground;
//   float uGlow, uBloom, uMotion, uNoise, uDistortion;
//   float uSaturationBase, uSaturationScale, uDetail;
//   float uMasterBrightness, uMasterGlow, uMasterExposure, uEvolutionPhase;
//
// Rules: GLSL ES 3.00 only. No textures. No gl_FragColor, texture2D,
// varying, attribute, or desktop-only constructs. Constant loop bounds.
in vec2 vUV;
out vec4 fragColor;
uniform float uTime;
uniform float uBass;
uniform float uEnergy;
uniform vec3 uPrimaryColour;
uniform vec3 uBackground;
void main() {
  vec2 p = vUV - 0.5;
  float r = length(p) * 2.0;
  float rings = 0.5 + 0.5 * sin(r * 12.0 - uTime * 2.0);
  float pump = 1.0 + uBass * 0.6 + uEnergy * 0.3;
  vec3 col = mix(uBackground, uPrimaryColour, rings * 0.5 * pump);
  col += uPrimaryColour * pow(max(0.0, 1.0 - r), 3.0) * (0.3 + uBass);
  fragColor = vec4(col, 1.0);
}
