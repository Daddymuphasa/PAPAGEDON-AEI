import type { ShaderDefinition } from '../../src/types';
import glsl from './circuit-veins.glsl';

export const circuitVeins: ShaderDefinition = {
  id: 'circuit-veins',
  name: 'Circuit Veins',
  meta: {
    themeTags: ['tech', 'circuit', 'neon'],
    energyRange: [0.3, 0.8],
    moods: ['electric', 'restless', 'sharp'],
  },
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
  tags: ['m3-visual'],
  params: [
    { key: 'p1', label: 'Pulse speed', min: 0, max: 3, def: 1.2 },
    { key: 'p2', label: 'Trace density', min: 0.5, max: 2, def: 1 },
    { key: 'p3', label: 'Node glow', min: 0, max: 2, def: 1 },
  ],
};
