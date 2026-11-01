import type { ShaderDefinition } from '../../src/types';
import glsl from './synthwave-sun.glsl';

export const synthwaveSun: ShaderDefinition = {
  id: 'synthwave-sun',
  name: 'Synthwave Sun',
  fragmentGlsl: glsl,
  uniforms: [
    'u_time',
    'u_bass',
    'u_mid',
    'u_high',
    'u_beat',
    'u_energy',
    'u_bpm',
    'u_intensity',
    'u_speed',
    'u_pulse',
    'u_p1',
    'u_p2',
    'u_p3',
    'u_resolution',
    'u_palette',
    'u_eventTex',
    'u_texMix',
    'u_segMask',
    'u_perfBox',
    'u_motion',
    'u_segMix',
  ],
  tags: ['shader-library'],
  params: [
    { key: 'p1', label: 'Grid glow', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Sun flare', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Edge chrome', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['retro', 'synthwave', '80s'],
    energyRange: [0.3, 0.8],
    moods: ['driving', 'neon', 'nostalgic'],
  },
};
