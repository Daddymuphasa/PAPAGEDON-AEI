import type { ShaderDefinition } from '../../src/types';
import glsl from './rose-petal-fall.glsl';

export const rosePetalFall: ShaderDefinition = {
  id: 'rose-petal-fall',
  name: 'Rose Petal Fall',
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
    { key: 'p1', label: 'Gust power', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Petal shimmer', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Garden glow', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['wedding', 'petals', 'romance'],
    energyRange: [0.2, 0.6],
    moods: ['soft', 'falling', 'sweet'],
  },
};
