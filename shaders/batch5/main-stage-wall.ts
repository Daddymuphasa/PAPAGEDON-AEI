import type { ShaderDefinition } from '../../src/types';
import glsl from './main-stage-wall.glsl';

export const mainStageWall: ShaderDefinition = {
  id: 'main-stage-wall',
  name: 'Main Stage Wall',
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
    { key: 'p1', label: 'Panel count', min: 0, max: 1.5, def: 1 },
    { key: 'p2', label: 'Chase flash', min: 0, max: 1.5, def: 1 },
    { key: 'p3', label: 'Crowd wash', min: 0, max: 1.5, def: 1 },
  ],
  meta: {
    themeTags: ['festival', 'led-wall', 'mainstage'],
    energyRange: [0.5, 1.0],
    moods: ['flashing', 'huge', 'driving'],
  },
};
