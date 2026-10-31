import type { ShaderDefinition } from '../../src/types';
import glsl from './laser-cathedral.glsl';

export const laserCathedral: ShaderDefinition = {
  id: 'laser-cathedral',
  name: 'Laser Cathedral',
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
    { key: 'p1', label: 'Beam width', min: 0, max: 1.5, def: 0.6 },
    { key: 'p2', label: 'Beam power', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Haze glints', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['laser', 'volumetric', 'anthem'],
    energyRange: [0.4, 0.9],
    moods: ['soaring', 'vast', 'sacred'],
  },
};
