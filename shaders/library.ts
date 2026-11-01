// Shared library registration: every page and server route registers the
// same DEFS array through here, so listShaders() (theme verification,
// fallbacks, prompts) always sees the full library. Takes defs as an
// argument so tests and server routes never import raw .glsl.
import type { ShaderDefinition } from '../src/types';
import { listShaders, registerShader } from './registry';

export function registerLibrary(defs: ShaderDefinition[]): string[] {
  for (const d of defs) registerShader(d);
  return listShaders().map((s) => s.id);
}
