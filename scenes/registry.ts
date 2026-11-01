// Scene registry: true-geometry three.js scenes alongside the fragment
// shader library. Same uniform contract (SceneUniforms), same metadata
// shape so the Director can pick from all of them.
import type { Scene3DDefinition } from '../src/types';

const scenes = new Map<string, Scene3DDefinition>();

export function registerScene(s: Scene3DDefinition): void {
  scenes.set(s.id, s);
}

export function getScene(id: string): Scene3DDefinition | null {
  return scenes.get(id) ?? null;
}

export function listScenes(): Scene3DDefinition[] {
  return [...scenes.values()];
}

export function isSceneId(id: string): boolean {
  return scenes.has(id);
}
