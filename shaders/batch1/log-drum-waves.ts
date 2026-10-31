import type { ShaderDefinition } from '../../src/types';
import glsl from './log-drum-waves.glsl';

export const logDrumWaves: ShaderDefinition = {
  id: 'log-drum-waves',
  name: 'Log Drum Waves',
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
    { key: 'p1', label: 'Wave height', min: 0, max: 1.5, def: 0.7 },
    { key: 'p2', label: 'Kick ripple', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Crest sparkle', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['amapiano', 'terrain', 'bass'],
    energyRange: [0.4, 1.0],
    moods: ['deep', 'rolling', 'heavy'],
  },
};
