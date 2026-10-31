import type { ShaderDefinition } from '../../src/types';
import glsl from './glitch-grid.glsl';

export const glitchGrid: ShaderDefinition = {
  id: 'glitch-grid',
  name: 'Glitch Grid',
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
    { key: 'p1', label: 'Tear amount', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'RGB split', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Data blocks', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['glitch', 'digital', 'snare'],
    energyRange: [0.5, 1.0],
    moods: ['broken', 'sharp', 'chaotic'],
  },
};
