import type { ShaderDefinition } from '../../src/types';
import glsl from './hypno-spiral.glsl';

export const hypnoSpiral: ShaderDefinition = {
  id: 'hypno-spiral',
  name: 'Hypno Spiral',
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
    { key: 'p1', label: 'Spiral arms', min: 0, max: 1, def: 0.5 },
    { key: 'p2', label: 'Core pull', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Fine lines', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['spiral', 'hypnotic', 'bpm'],
    energyRange: [0.3, 0.8],
    moods: ['dizzy', 'looping', 'deep'],
  },
};
