import type { ShaderDefinition } from '../../src/types';
import glsl from './circuit-veins.glsl';

export const circuitVeins: ShaderDefinition = {
  id: 'circuit-veins',
  name: 'Circuit Veins',
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
    { key: 'p1', label: 'Pulse speed', min: 0, max: 3, def: 1.2 },
    { key: 'p2', label: 'Trace density', min: 0.5, max: 2, def: 1 },
    { key: 'p3', label: 'Node glow', min: 0, max: 2, def: 1 },
  ],
};
