import type { ShaderDefinition } from '../../src/types';
import glsl from './euphoria-rays.glsl';

export const euphoriaRays: ShaderDefinition = {
  id: 'euphoria-rays',
  name: 'Euphoria Rays',
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
    { key: 'p1', label: 'Ray count', min: 0, max: 1.5, def: 0.7 },
    { key: 'p2', label: 'Whiteout', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Ray shimmer', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['god-rays', 'peak', 'euphoric'],
    energyRange: [0.5, 1.0],
    moods: ['bursting', 'holy', 'peak'],
  },
};
