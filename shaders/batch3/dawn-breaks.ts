import type { ShaderDefinition } from '../../src/types';
import glsl from './dawn-breaks.glsl';

export const dawnBreaks: ShaderDefinition = {
  id: 'dawn-breaks',
  name: 'Dawn Breaks',
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
    { key: 'p1', label: 'Dawn speed', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Horizon glow', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Ridge light', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['dawn', 'sunrise', 'worship'],
    energyRange: [0.2, 0.8],
    moods: ['breaking', 'fresh', 'rising'],
  },
};
