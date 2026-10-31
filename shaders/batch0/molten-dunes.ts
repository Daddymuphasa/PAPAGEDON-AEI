import type { ShaderDefinition } from '../../src/types';
import glsl from './molten-dunes.glsl';

export const moltenDunes: ShaderDefinition = {
  id: 'molten-dunes',
  name: 'Molten Dunes',
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
    { key: 'p1', label: 'Crack scale', min: 0, max: 2, def: 0.5 },
    { key: 'p2', label: 'Rock lift', min: 0, max: 1, def: 0.5 },
    { key: 'p3', label: 'Ridge sharpness', min: 0, max: 1, def: 0.5 },
  ],
  meta: {
    themeTags: ['lava', 'desert', 'slow'],
    energyRange: [0.1, 0.6],
    moods: ['ancient', 'hot', 'heavy'],
  },
};
