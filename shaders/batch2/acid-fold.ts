import type { ShaderDefinition } from '../../src/types';
import glsl from './acid-fold.glsl';

export const acidFold: ShaderDefinition = {
  id: 'acid-fold',
  name: 'Acid Fold',
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
    { key: 'p1', label: 'Melt amount', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Color cycle', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Core squelch', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['acid', '303', 'trippy'],
    energyRange: [0.5, 1.0],
    moods: ['melting', 'wild', 'squelchy'],
  },
};
