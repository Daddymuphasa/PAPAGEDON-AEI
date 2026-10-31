import type { ShaderDefinition } from '../../src/types';
import glsl from './warehouse-fog.glsl';

export const warehouseFog: ShaderDefinition = {
  id: 'warehouse-fog',
  name: 'Warehouse Fog',
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
    { key: 'p1', label: 'Shaft count', min: 0, max: 1.5, def: 0.7 },
    { key: 'p2', label: 'Shaft power', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Fog glints', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['fog', 'warehouse', 'moody'],
    energyRange: [0.2, 0.7],
    moods: ['dark', 'heavy', 'patient'],
  },
};
