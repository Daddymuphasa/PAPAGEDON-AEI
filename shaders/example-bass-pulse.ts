import type { ShaderDefinition } from '../src/types';
import glsl from './example-bass-pulse.glsl';
import { registerShader } from './registry';

export const exampleBassPulse: ShaderDefinition = {
  id: 'example-bass-pulse',
  name: 'Example Bass Pulse',
  fragmentGlsl: glsl,
  uniforms: ['u_time', 'u_bass', 'u_mid', 'u_high', 'u_beat', 'u_intensity', 'u_resolution', 'u_palette'],
};

registerShader(exampleBassPulse);
