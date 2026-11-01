// Catalog sync: the plain-data catalog must match the real definitions.
// Fails loudly when a visual is added, renamed or re-tagged without
// updating shaders/catalog.ts. Node-safe: reads sources as text, never
// imports .glsl.
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { CATALOG, CATALOG_IDS } from './catalog';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SCAN_DIRS = ['shaders/batch0', 'shaders/batch1', 'shaders/batch2', 'shaders/batch3', 'shaders/batch4', 'shaders/batch5', 'shaders/m3', 'scenes/pack3d'];

function definitionFiles(): string[] {
  const out: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const f of readdirSync(join(ROOT, dir))) {
      if (f.endsWith('.ts') && !f.endsWith('.test.ts')) out.push(join(dir, f));
    }
  }
  return out;
}

function readId(rel: string): string | null {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  return src.match(/^\s*id:\s*'([^']+)'/m)?.[1] ?? null;
}

describe('catalog', () => {
  test('every definition file on disk is listed exactly once', () => {
    const files = definitionFiles();
    expect(files.length).toBeGreaterThan(60);
    const seen = new Set<string>();
    for (const f of files) {
      const id = readId(f);
      expect(id, `${f} declares an id`).not.toBeNull();
      expect(CATALOG_IDS, `${f} (${id}) is catalogued`).toContain(id);
      expect(seen.has(id as string)).toBe(false);
      seen.add(id as string);
    }
    expect(CATALOG_IDS).toHaveLength(files.length);
  });

  test('every catalog entry points at a real file declaring that id', () => {
    for (const c of CATALOG) {
      const unix = c.file.split('\\').join('/');
      expect(existsSync(join(ROOT, unix)), `${c.id} file exists`).toBe(true);
      expect(readId(unix)).toBe(c.id);
      expect(c.name.trim().length).toBeGreaterThan(0);
      expect(c.themeTags.length).toBeGreaterThan(0);
      expect(c.moods.length).toBeGreaterThan(0);
      expect(c.energyRange[0]).toBeLessThanOrEqual(c.energyRange[1]);
    }
  });

  test('catalog opens on hex-core (shared index-0 fallback)', () => {
    expect(CATALOG[0]?.id).toBe('hex-core');
  });
});
