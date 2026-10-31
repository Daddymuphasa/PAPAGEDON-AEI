import type { ShaderDefinition } from '../../src/types';
import glsl from './particle-galaxy.glsl';

export const particleGalaxy: ShaderDefinition = {
  id: 'particle-galaxy',
  name: 'Particle Galaxy',
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
    { key: 'p1', label: 'Swirl rate', min: 0, max: 2, def: 1 },
    { key: 'p2', label: 'Arm sharpness', min: 0, max: 2, def: 0.5 },
    { key: 'p3', label: 'Star density', min: 0, max: 2, def: 1 },
  ],
  meta: {
    themeTags: ['cosmic', 'vast', 'dreamy'],
    energyRange: [0.1, 0.9],
    moods: ['wonder', 'euphoric', 'vast'],
  },
};
