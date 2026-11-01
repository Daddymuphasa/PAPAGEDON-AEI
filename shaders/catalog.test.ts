import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, CATALOG_IDS, catalogEntry } from './catalog';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const core = join(root, 'public', 'papagedon-core');

interface ManifestShader {
  id: string;
  name: string;
  file: string;
  source: string;
  energyLevel: string | null;
}

interface ManifestPack {
  id: string;
  name: string;
  recommendedTheme: string | null;
  shaders: ManifestShader[];
}

interface Manifest {
  themes: unknown[];
  packs: ManifestPack[];
}

function manifest(): Manifest {
  return JSON.parse(readFileSync(join(root, 'src', 'lib', 'papagedon', 'catalog.json'), 'utf8')) as Manifest;
}

function diskFrags(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) diskFrags(p, out);
    else if (e.name.endsWith('.frag')) out.push(p);
  }
  return out;
}

describe('engine shader catalog', () => {
  test('ids are unique and CATALOG_IDS matches', () => {
    const ids = CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CATALOG_IDS).toEqual(ids);
    expect(CATALOG.length).toBe(86);
  });

  test('entries are well-formed', () => {
    for (const c of CATALOG) {
      expect(c.name.trim().length).toBeGreaterThan(0);
      expect(c.themeTags.length).toBeGreaterThan(0);
      expect(c.moods.length).toBeGreaterThan(0);
      const [lo, hi] = c.energyRange;
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(1);
      expect(lo).toBeLessThanOrEqual(hi);
      expect(catalogEntry(c.id)?.name).toBe(c.name);
    }
    expect(catalogEntry('no-such-shader')).toBeUndefined();
  });

  test('catalog matches the engine manifest', () => {
    const m = manifest();
    const mids = m.packs.flatMap((p) => p.shaders.map((s) => s.id));
    const cids = new Set(CATALOG.map((c) => c.id));
    for (const id of mids) expect(cids.has(id), `manifest id missing from catalog: ${id}`).toBe(true);
    const mset = new Set(mids);
    for (const c of CATALOG) expect(mset.has(c.id), `catalog id missing from manifest: ${c.id}`).toBe(true);
    const byId = new Map(m.packs.flatMap((p) => p.shaders).map((s) => [s.id, s]));
    for (const c of CATALOG) {
      const s = byId.get(c.id);
      expect(s?.name).toBe(c.name);
      expect(s?.file).toBe(c.file);
    }
  });

  test('every entry file exists on disk and every disk shader has an entry', () => {
    const files = new Set(CATALOG.map((c) => c.file));
    for (const c of CATALOG) {
      expect(existsSync(join(core, c.file)), `missing on disk: ${c.file}`).toBe(true);
    }
    const disk = diskFrags(join(core, 'shaders'));
    expect(disk.length).toBe(86);
    for (const abs of disk) {
      const rel = abs.substring(core.length + 1).replace(/\\/g, '/');
      expect(files.has(rel), `disk shader without catalog entry: ${rel}`).toBe(true);
    }
  });

  test('converted shaders carry the ES header and no desktop version', () => {
    for (const c of CATALOG) {
      const src = readFileSync(join(core, c.file), 'utf8');
      expect(src.startsWith('#version 300 es\n'), `${c.id}: missing ES header`).toBe(true);
      expect(
        src.includes('#version 330') || src.includes('#version 460'),
        `${c.id}: desktop version left`,
      ).toBe(false);
      expect(src.includes('vUV') && src.includes('fragColor'), `${c.id}: missing vUV/fragColor`).toBe(true);
    }
  });

  test('Badman/Trance moods match the core metadata JSON', () => {
    for (const c of CATALOG) {
      const m = /^(BadmanExperiencePack|TranceExperiencePack)\/(\d+_.*)$/.exec(c.id);
      if (!m) continue;
      const metaPath = join(core, 'shaders', m[1], 'metadata', `${m[2]}.json`);
      expect(existsSync(metaPath), `missing metadata: ${c.id}`).toBe(true);
      const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { mood?: unknown };
      expect([...c.moods].sort()).toEqual([...(meta.mood as string[])].sort());
    }
  });
});
