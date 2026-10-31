import type { ShaderDefinition } from '../../src/types';
import glsl from './heavenly-light.glsl';

export const heavenlyLight: ShaderDefinition = {
  id: 'heavenly-light',
  name: 'Heavenly Light',
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
    { key: 'p1', label: 'Ambient glow', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Shaft power', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Aura glints', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['gospel', 'light', 'choir'],
    energyRange: [0.2, 0.7],
    moods: ['soft', 'lifting', 'holy'],
  },
};
