import type { ShaderDefinition } from '../../src/types';
import glsl from './savanna-sunset-pulse.glsl';

export const savannaSunsetPulse: ShaderDefinition = {
  id: 'savanna-sunset-pulse',
  name: 'Savanna Sunset Pulse',
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
    { key: 'p1', label: 'Sky bands', min: 0, max: 1, def: 0.5 },
    { key: 'p2', label: 'Grass height', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Dusk birds', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['sunset', 'savanna', 'calm'],
    energyRange: [0.1, 0.5],
    moods: ['peaceful', 'golden', 'open'],
  },
};
