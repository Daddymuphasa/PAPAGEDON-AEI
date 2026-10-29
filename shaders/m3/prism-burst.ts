import type { ShaderDefinition } from '../../src/types';
import glsl from './prism-burst.glsl';

export const prismBurst: ShaderDefinition = {
  id: 'prism-burst',
  name: 'Prism Burst',
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
  ],
  tags: ['m3-visual'],
  params: [
    { key: 'p1', label: 'Shard density', min: 0.5, max: 2, def: 1 },
    { key: 'p2', label: 'Burst power', min: 0, max: 2, def: 1 },
    { key: 'p3', label: 'Sparkle', min: 0, max: 2, def: 1 },
  ],
};
