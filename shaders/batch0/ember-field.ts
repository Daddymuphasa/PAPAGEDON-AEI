import type { ShaderDefinition } from '../../src/types';
import glsl from './ember-field.glsl';

export const emberField: ShaderDefinition = {
  id: 'ember-field',
  name: 'Ember Field',
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
    { key: 'p1', label: 'Rise speed', min: 0, max: 2, def: 1 },
    { key: 'p2', label: 'Brightness', min: 0, max: 2, def: 1 },
    { key: 'p3', label: 'Ember size', min: 0, max: 1, def: 0.5 },
  ],
  meta: {
    themeTags: ['fire', 'night', 'organic'],
    energyRange: [0.1, 0.8],
    moods: ['warm', 'wild', 'alive'],
  },
};
