import type { ShaderDefinition } from '../../src/types';
import glsl from './stained-glass-bloom.glsl';

export const stainedGlassBloom: ShaderDefinition = {
  id: 'stained-glass-bloom',
  name: 'Stained Glass Bloom',
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
    { key: 'p1', label: 'Glass petals', min: 0, max: 1, def: 0.5 },
    { key: 'p2', label: 'Bloom flash', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Glass glints', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['church', 'glass', 'bloom'],
    energyRange: [0.2, 0.6],
    moods: ['slow', 'glowing', 'still'],
  },
};
