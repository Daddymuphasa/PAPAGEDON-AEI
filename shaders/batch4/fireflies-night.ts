import type { ShaderDefinition } from '../../src/types';
import glsl from './fireflies-night.glsl';

export const firefliesNight: ShaderDefinition = {
  id: 'fireflies-night',
  name: 'Fireflies Night',
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
    { key: 'p1', label: 'Glow size', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Core flash', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Meadow glow', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['night', 'fireflies', 'meadow'],
    energyRange: [0.1, 0.5],
    moods: ['twinkling', 'quiet', 'soft'],
  },
};
