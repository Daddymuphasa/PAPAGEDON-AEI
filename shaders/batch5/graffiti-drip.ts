import type { ShaderDefinition } from '../../src/types';
import glsl from './graffiti-drip.glsl';

export const graffitiDrip: ShaderDefinition = {
  id: 'graffiti-drip',
  name: 'Graffiti Drip',
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
    { key: 'p1', label: 'Drip length', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Outline pop', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Spray flecks', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['hip-hop', 'graffiti', 'street'],
    energyRange: [0.4, 0.9],
    moods: ['raw', 'dripping', 'bold'],
  },
};
