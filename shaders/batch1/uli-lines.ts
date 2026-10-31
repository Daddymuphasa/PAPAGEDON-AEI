import type { ShaderDefinition } from '../../src/types';
import glsl from './uli-lines.glsl';

export const uliLines: ShaderDefinition = {
  id: 'uli-lines',
  name: 'Uli Lines',
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
    { key: 'p1', label: 'Line density', min: 0, max: 1.5, def: 0.5 },
    { key: 'p2', label: 'Ink weight', min: 0, max: 2, def: 1 },
    { key: 'p3', label: 'Dot accents', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['igbo', 'line-art', 'minimal'],
    energyRange: [0.1, 0.6],
    moods: ['elegant', 'flowing', 'calm'],
  },
};
