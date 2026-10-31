import type { ShaderDefinition } from '../../src/types';
import glsl from './bass-portal.glsl';

export const bassPortal: ShaderDefinition = {
  id: 'bass-portal',
  name: 'Bass Portal',
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
    { key: 'p1', label: 'Ring size', min: 0.5, max: 1.5, def: 1 },
    { key: 'p2', label: 'Shockwaves', min: 0, max: 2, def: 1 },
    { key: 'p3', label: 'Warp', min: 0, max: 1, def: 0.5 },
  ],
  meta: {
    themeTags: ['portal', 'bass', 'hypnotic'],
    energyRange: [0.4, 1.0],
    moods: ['deep', 'heavy', 'hypnotic'],
  },
};
