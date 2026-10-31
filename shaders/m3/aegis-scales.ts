import type { ShaderDefinition } from '../../src/types';
import glsl from './aegis-scales.glsl';

export const aegisScales: ShaderDefinition = {
  id: 'aegis-scales',
  name: 'Aegis Scales',
  meta: {
    themeTags: ['armor', 'metallic', 'dark'],
    energyRange: [0.2, 0.7],
    moods: ['strong', 'dark', 'sleek'],
  },
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
  tags: ['m3-visual'],
  params: [
    { key: 'p1', label: 'Shimmer', min: 0, max: 2, def: 1 },
    { key: 'p2', label: 'Scale size', min: 0.5, max: 2, def: 1 },
    { key: 'p3', label: 'Flex amount', min: 0, max: 1, def: 0.6 },
  ],
};
