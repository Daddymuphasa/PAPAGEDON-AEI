// Pack-3D contract tests. Same shape as the batch suites: the scene files
// import three.js, which has no place in node tests, so these tests read
// the sources from disk and check the uniform contract, palette-only
// colour, and director metadata. The registry + planner-compat checks run
// against the real modules (DOM-free).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { getScene, isSceneId, listScenes, registerScene } from '../registry';
import type { Scene3DDefinition } from '../../src/types';
import { mapThemeToOpening } from '../../src/director/showLogic';
import { verifyShowPlan } from '../../src/director/verifyShowPlan';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const SCENES = ['planet-rings-3d', 'neon-tunnel-3d'] as const;

function readScene(id: string): string {
  return readFileSync(join(HERE, `${id}.ts`), 'utf8');
}

function readPage(p: string): string {
  return readFileSync(join(ROOT, p), 'utf8');
}

describe('Pack-3D scene contract', () => {
  for (const id of SCENES) {
    test(`${id}: scene definition shape`, () => {
      const src = readScene(id);
      expect(src).toContain("kind: 'scene3d'");
      expect(src).toContain(`id: '${id}'`);
      expect(src).toContain('create(');
      expect(src).toContain('update(');
      expect(src).toContain('dispose(');
      expect(src).toContain("'shader-library'");
    });

    test(`${id}: same uniform contract as the fragment shaders`, () => {
      const src = readScene(id);
      expect(src).toContain('SceneUniforms');
      // Every contract field is read through the shared uniforms object.
      for (const f of ['u.time', 'u.energy', 'u.beat', 'u.bass', 'u.mid', 'u.high', 'u.palette', 'u.p1', 'u.p2', 'u.p3']) {
        expect(src.includes(f), `${id} must read ${f}`).toBe(true);
      }
    });

    test(`${id}: colours from the palette, never hardcoded`, () => {
      const src = readScene(id);
      expect(src).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(src).toContain('u.palette[');
    });

    test(`${id}: valid director metadata`, () => {
      const src = readScene(id);
      expect(src).toContain('themeTags');
      expect(src).toContain('energyRange');
      expect(src).toContain('moods');
      const m = src.match(/energyRange:\s*\[([0-9.]+),\s*([0-9.]+)\]/);
      expect(m, `${id} needs a numeric energyRange`).not.toBeNull();
      const lo = Number(m![1]);
      const hi = Number(m![2]);
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(1);
      expect(lo).toBeLessThan(hi);
    });
  }

  test('scene ids are unique', () => {
    expect(new Set(SCENES).size).toBe(SCENES.length);
  });
});

describe('Scene registry', () => {
  const fake: Scene3DDefinition = {
    kind: 'scene3d',
    id: 'test-scene-3d',
    name: 'Test Scene',
    tags: ['shader-library', 'scene3d'],
    params: [{ key: 'p1', label: 'One', min: 0, max: 1, def: 0.5 }],
    meta: { themeTags: ['test'], energyRange: [0, 1], moods: ['flat'] },
    create: () => ({ object: {}, update: () => {} }),
  };

  test('register/get/list/isSceneId round-trip', () => {
    expect(isSceneId(fake.id)).toBe(false);
    registerScene(fake);
    expect(isSceneId(fake.id)).toBe(true);
    expect(getScene(fake.id)?.name).toBe('Test Scene');
    expect(listScenes().some((s) => s.id === fake.id)).toBe(true);
  });

  test('unknown scene ids miss', () => {
    expect(getScene('no-such-scene')).toBeNull();
    expect(isSceneId('hex-core')).toBe(false);
  });
});

describe('Director accepts 3D scenes', () => {
  const sceneDefs = [
    {
      kind: 'scene3d',
      id: 'planet-rings-3d',
      name: 'Planet Rings 3D',
      params: [
        { key: 'p1', label: 'Ring tilt', min: 0, max: 1.5, def: 1 },
        { key: 'p2', label: 'Glow halo', min: 0, max: 1.5, def: 1 },
        { key: 'p3', label: 'Star drift', min: 0, max: 2, def: 1 },
      ],
    },
  ];

  test('mapThemeToOpening can open on a scene', () => {
    const theme = {
      suggestedShaderIds: ['planet-rings-3d'],
    } as unknown as Parameters<typeof mapThemeToOpening>[0];
    expect(mapThemeToOpening(theme, sceneDefs)).toBe('planet-rings-3d');
  });

  test('verifyShowPlan accepts a plan that picks a scene', () => {
    const plan = {
      visualId: 'planet-rings-3d',
      params: [1, 1, 1],
      intensity: 0.8,
      speed: 1,
      paletteEmphasis: 0,
      transition: { type: 'crossfade', durationMs: 1500 },
      energyArc: 'peak',
      sectionSeconds: 30,
      reason: 'scene acceptance test',
    };
    const res = verifyShowPlan(plan, sceneDefs, ['hex-core']);
    expect(res.ok).toBe(true);
  });
});

describe('3D stage wiring', () => {
  for (const id of SCENES) {
    test(`${id}: reachable from gallery, control and output`, () => {
      expect(readPage('src/app/gallery/page.tsx')).toContain(id);
      expect(readPage('src/app/show/control/page.tsx')).toContain(id);
      expect(readPage('src/app/show/output/page.tsx')).toContain(id);
    });
  }

  test('gallery has a True-3D pack', () => {
    expect(readPage('src/app/gallery/page.tsx')).toContain('pack3d');
  });
});
