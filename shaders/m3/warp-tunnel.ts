import type { ShaderDefinition } from '../../src/types';
import glsl from './warp-tunnel.glsl';

export const warpTunnel: ShaderDefinition = {
  id: 'warp-tunnel',
  name: 'Warp Tunnel',
  meta: {
    themeTags: ['tunnel', 'fast', 'cosmic'],
    energyRange: [0.5, 1.0],
    moods: ['rushing', 'vast', 'intense'],
  },
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
  tags: ['m3-visual'],
  params: [
    { key: 'p1', label: 'Twist', min: 0, max: 2, def: 0.6 },
    { key: 'p2', label: 'Ring density', min: 0.5, max: 2.5, def: 1 },
    { key: 'p3', label: 'Warp amount', min: 0, max: 1.5, def: 0.8 },
  ],
};
