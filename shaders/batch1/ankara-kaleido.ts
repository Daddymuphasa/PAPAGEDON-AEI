import type { ShaderDefinition } from '../../src/types';
import glsl from './ankara-kaleido.glsl';

export const ankaraKaleido: ShaderDefinition = {
  id: 'ankara-kaleido',
  name: 'Ankara Kaleido',
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
    { key: 'p1', label: 'Segments', min: 0, max: 1, def: 0.5 },
    { key: 'p2', label: 'Motif dots', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Spin drift', min: 0, max: 2, def: 1 },
  ],
  meta: {
    themeTags: ['wax-print', 'bold', 'celebration'],
    energyRange: [0.5, 1.0],
    moods: ['festive', 'vivid', 'driving'],
  },
};
