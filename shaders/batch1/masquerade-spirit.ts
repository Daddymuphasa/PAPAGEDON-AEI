import type { ShaderDefinition } from '../../src/types';
import glsl from './masquerade-spirit.glsl';

export const masqueradeSpirit: ShaderDefinition = {
  id: 'masquerade-spirit',
  name: 'Masquerade Spirit',
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
    { key: 'p1', label: 'Form scale', min: 0, max: 1.5, def: 0.5 },
    { key: 'p2', label: 'Crown flare', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Spirit glints', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['masquerade', 'spirit', 'symmetric'],
    energyRange: [0.4, 0.9],
    moods: ['mystical', 'powerful', 'shifting'],
  },
};
