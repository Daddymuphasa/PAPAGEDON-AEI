import type { ShaderDefinition } from '../../src/types';
import glsl from './liquid-mirror.glsl';

export const liquidMirror: ShaderDefinition = {
  id: 'liquid-mirror',
  name: 'Liquid Mirror',
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
    { key: 'p1', label: 'Wave scale', min: 0, max: 2, def: 0.5 },
    { key: 'p2', label: 'Warp amount', min: 0, max: 2, def: 1 },
    { key: 'p3', label: 'Ripple strength', min: 0, max: 2, def: 1 },
  ],
  meta: {
    themeTags: ['fluid', 'chrome', 'luxe'],
    energyRange: [0.2, 0.7],
    moods: ['smooth', 'liquid', 'premium'],
  },
};
