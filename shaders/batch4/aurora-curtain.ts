import type { ShaderDefinition } from '../../src/types';
import glsl from './aurora-curtain.glsl';

export const auroraCurtain: ShaderDefinition = {
  id: 'aurora-curtain',
  name: 'Aurora Curtain',
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
    { key: 'p1', label: 'Curtain sway', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Ray shimmer', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Sky band', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['aurora', 'night-sky', 'polar'],
    energyRange: [0.2, 0.7],
    moods: ['flowing', 'cold', 'magic'],
  },
};
