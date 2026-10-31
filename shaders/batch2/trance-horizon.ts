import type { ShaderDefinition } from '../../src/types';
import glsl from './trance-horizon.glsl';

export const tranceHorizon: ShaderDefinition = {
  id: 'trance-horizon',
  name: 'Trance Horizon',
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
    { key: 'p1', label: 'Sun bloom', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Grid detail', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Sky sparkle', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['trance', 'horizon', 'euphoric'],
    energyRange: [0.4, 1.0],
    moods: ['uplifting', 'endless', 'glowing'],
  },
};
