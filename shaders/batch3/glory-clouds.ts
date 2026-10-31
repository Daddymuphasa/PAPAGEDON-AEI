import type { ShaderDefinition } from '../../src/types';
import glsl from './glory-clouds.glsl';

export const gloryClouds: ShaderDefinition = {
  id: 'glory-clouds',
  name: 'Glory Clouds',
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
    { key: 'p1', label: 'Cloud scale', min: 0, max: 1.5, def: 0.5 },
    { key: 'p2', label: 'Gold rims', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Core glints', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['gospel', 'clouds', 'gold'],
    energyRange: [0.3, 0.8],
    moods: ['parting', 'bright', 'hopeful'],
  },
};
