import type { ShaderDefinition } from '../../src/types';
import glsl from './hex-core.glsl';

export const hexCore: ShaderDefinition = {
  id: 'hex-core',
  name: 'Hex Core',
  meta: {
    themeTags: ['geometric', 'core', 'neon'],
    energyRange: [0.3, 0.9],
    moods: ['focused', 'driving', 'bright'],
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
    { key: 'p1', label: 'Ripple speed', min: 0, max: 2, def: 1 },
    { key: 'p2', label: 'Core size', min: 0.1, max: 0.6, def: 0.28 },
    { key: 'p3', label: 'Cell glow', min: 0, max: 1.5, def: 1 },
  ],
};
