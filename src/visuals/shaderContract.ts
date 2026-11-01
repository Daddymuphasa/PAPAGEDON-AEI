// Engine GLSL authoring contract, shared by the Muse Spark shader prompt,
// the static pre-check and the browser compile check. Client-safe: no
// keys, no fetches. The runtime adapter (toWebGL2) adds the ES 3.00
// header, so authored sources must NOT include a #version line.
export const ENGINE_SHADER_CONTRACT = [
  'Write ONE WebGL2 fragment shader body (no #version line, no markdown, no fences).',
  'Required interface, exactly:',
  '  in vec2 vUV;            // 0..1 fullscreen coordinate',
  '  out vec4 fragColor;     // final colour',
  '  void main() { ... fragColor = vec4(colour, 1.0); }',
  'You may declare and use any of these uniforms (all set every frame):',
  '  float uTime, uEnergy, uIntensity, uBass, uMid, uTreble, uBeat, uMood;',
  '  vec2 uResolution;',
  '  vec3 uPrimaryColour, uSecondaryColour, uAccentColour, uBackground;',
  '  float uGlow, uBloom, uMotion, uNoise, uDistortion;',
  '  float uSaturationBase, uSaturationScale, uDetail;',
  '  float uMasterBrightness, uMasterGlow, uMasterExposure, uEvolutionPhase;',
  'Rules: GLSL ES 3.00 only. No textures or samplers. No gl_FragColor,',
  'texture2D, varying, attribute, or desktop-only constructs. Loops must',
  'have constant bounds under 64 iterations. Animate with uTime and the',
  'audio uniforms; keep the background dark so it projects cleanly.',
].join('\n');

const BANNED_TOKENS = [
  '#version',
  'gl_FragColor',
  'texture2D',
  'varying',
  'attribute',
  'gl_FragDepth',
  'sampler3D',
  'dvec2',
  'dvec3',
  'dvec4',
];

export interface ShaderScan {
  ok: boolean;
  errors: string[];
}

export interface ShaderBrief {
  mood?: string;
  energy?: number;
  prompt?: string;
}

export interface ShaderFeedback {
  previous: string;
  errors: string[];
}

// Comments carry no code: strip them before every check so documentation
// (or a chatty model) can name banned tokens or braces without failing.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

// Static pre-check: required interface present, banned tokens absent,
// braces balanced. The browser compile check is still authoritative.
export function scanShaderSource(src: string): ShaderScan {
  const errors: string[] = [];
  const code = stripComments(src);
  if (!code.includes('in vec2 vUV')) errors.push('missing "in vec2 vUV" input');
  if (!code.includes('out vec4 fragColor')) errors.push('missing "out vec4 fragColor" output');
  if (!code.includes('void main')) errors.push('missing main()');
  for (const b of BANNED_TOKENS) {
    if (code.includes(b)) errors.push(`banned token: ${b}`);
  }
  let depth = 0;
  for (const ch of code) {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    if (depth < 0) break;
  }
  if (depth !== 0) errors.push('unbalanced braces');
  return { ok: errors.length === 0, errors };
}

// Mock generated visual: valid engine-conformant GLSL used in mock mode
// and as the documented minimal example of the contract.
export function mockEngineShader(): string {
  return [
    '// Mock engine visual: breathing rings in the theme colours.',
    'in vec2 vUV;',
    'out vec4 fragColor;',
    'uniform float uTime;',
    'uniform float uBass;',
    'uniform float uEnergy;',
    'uniform vec3 uPrimaryColour;',
    'uniform vec3 uBackground;',
    'void main() {',
    '  vec2 p = vUV - 0.5;',
    '  float r = length(p) * 2.0;',
    '  float rings = 0.5 + 0.5 * sin(r * 12.0 - uTime * 2.0);',
    '  float pump = 1.0 + uBass * 0.6 + uEnergy * 0.3;',
    '  vec3 col = mix(uBackground, uPrimaryColour, rings * 0.5 * pump);',
    '  col += uPrimaryColour * pow(max(0.0, 1.0 - r), 3.0) * (0.3 + uBass);',
    '  fragColor = vec4(col, 1.0);',
    '}',
  ].join('\n');
}
