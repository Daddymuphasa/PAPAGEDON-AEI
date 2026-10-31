import type { ShaderDefinition } from '../../src/types';
import glsl from './strobe-lattice.glsl';

export const strobeLattice: ShaderDefinition = {
  id: 'strobe-lattice',
  name: 'Strobe Lattice',
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
    { key: 'p1', label: 'Lattice scale', min: 0, max: 1.5, def: 0.5 },
    { key: 'p2', label: 'Strobe flash', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Core glow', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['laser', 'techno', 'strobe'],
    energyRange: [0.6, 1.0],
    moods: ['snapping', 'hard', 'electric'],
  },
};
