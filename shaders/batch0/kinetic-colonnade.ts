import type { ShaderDefinition } from '../../src/types';
import glsl from './kinetic-colonnade.glsl';

export const kineticColonnade: ShaderDefinition = {
  id: 'kinetic-colonnade',
  name: 'Kinetic Colonnade',
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
    { key: 'p1', label: 'Chase speed', min: 0, max: 2, def: 1 },
    { key: 'p2', label: 'Dolly speed', min: 0, max: 2, def: 1 },
    { key: 'p3', label: 'Depth haze', min: 0, max: 1, def: 0.5 },
  ],
  meta: {
    themeTags: ['architecture', 'monumental', '3d'],
    energyRange: [0.4, 1.0],
    moods: ['powerful', 'monumental', 'driving'],
  },
};
