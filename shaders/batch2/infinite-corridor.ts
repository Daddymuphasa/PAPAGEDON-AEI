import type { ShaderDefinition } from '../../src/types';
import glsl from './infinite-corridor.glsl';

export const infiniteCorridor: ShaderDefinition = {
  id: 'infinite-corridor',
  name: 'Infinite Corridor',
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
    { key: 'p1', label: 'Wall panels', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Trim lines', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Dust motes', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['tunnel', 'mirror', 'rush'],
    energyRange: [0.4, 0.9],
    moods: ['rushing', 'deep', 'propulsive'],
  },
};
