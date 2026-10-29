// Shader registry. M6 batches register here via registerShader().
// Nothing here is copied from any existing engine: every shader in this
// repo is written new during the hackathon building period.
import type { ShaderDefinition } from '../src/types';

const shaders = new Map<string, ShaderDefinition>();

export function registerShader(s: ShaderDefinition): void {
  shaders.set(s.id, s);
}

export function getShader(id: string): ShaderDefinition | null {
  return shaders.get(id) ?? null;
}

export function listShaders(): ShaderDefinition[] {
  return [...shaders.values()];
}
