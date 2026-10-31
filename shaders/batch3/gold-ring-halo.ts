import type { ShaderDefinition } from '../../src/types';
import glsl from './gold-ring-halo.glsl';

export const goldRingHalo: ShaderDefinition = {
  id: 'gold-ring-halo',
  name: 'Gold Ring Halo',
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
    { key: 'p1', label: 'Orbit speed', min: 0, max: 2, def: 1 },
    { key: 'p2', label: 'Join flare', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Ring sparkle', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['wedding', 'rings', 'gold'],
    energyRange: [0.3, 0.8],
    moods: ['joining', 'shining', 'eternal'],
  },
};
