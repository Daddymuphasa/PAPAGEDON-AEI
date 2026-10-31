import type { ShaderDefinition } from '../../src/types';
import glsl from './starfield-warp.glsl';

export const starfieldWarp: ShaderDefinition = {
  id: 'starfield-warp',
  name: 'Starfield Warp',
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
    { key: 'p1', label: 'Warp stretch', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Star glare', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Core flash', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['cosmic', 'hyperspace', 'drop'],
    energyRange: [0.5, 1.0],
    moods: ['rushing', 'fast', 'warping'],
  },
};
