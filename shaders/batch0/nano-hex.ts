import type { ShaderDefinition } from '../../src/types';
import glsl from './nano-hex.glsl';

export const nanoHex: ShaderDefinition = {
  id: 'nano-hex',
  name: 'Nano Hex',
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
    { key: 'p1', label: 'Grid density', min: 0, max: 1.5, def: 0.5 },
    { key: 'p2', label: 'Ripple speed', min: 0, max: 2, def: 1 },
    { key: 'p3', label: 'Cell glow', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['geometric', 'neon', 'minimal'],
    energyRange: [0.2, 0.8],
    moods: ['precise', 'electric', 'hypnotic'],
  },
};
