import type { ShaderDefinition } from '../../src/types';
import glsl from './confetti-burst.glsl';

export const confettiBurst: ShaderDefinition = {
  id: 'confetti-burst',
  name: 'Confetti Burst',
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
    { key: 'p1', label: 'Blast radius', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Core flash', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Air shimmer', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['festival', 'confetti', 'party'],
    energyRange: [0.5, 1.0],
    moods: ['exploding', 'joyful', 'loud'],
  },
};
