// M9-B Batch-3 contract tests. Same shape as the earlier batch suites: the
// .ts registry files import raw .glsl, which vitest cannot transform, so
// these tests read both files from disk and check the uniform contract,
// the shared tails, the quality knob, and the director metadata. Browser
// compile + fps are measured live by the gallery benchmark.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { LIB_TAG, verifyVisualizer } from '../verifyVisualizer';

const HERE = dirname(fileURLToPath(import.meta.url));

const SHADERS = [
  'heavenly-light',
  'stained-glass-bloom',
  'rising-doves',
  'glory-clouds',
  'candle-field',
  'rose-petal-fall',
  'gold-ring-halo',
  'silk-ribbon-dance',
  'crystal-chandelier',
  'dawn-breaks',
] as const;

// Every name in the M9-B uniform contract.
const CONTRACT = [
  'u_time',
  'u_resolution',
  'u_energy',
  'u_beat',
  'u_bass',
  'u_mid',
  'u_high',
  'u_palette',
  'u_eventTex',
  'u_texMix',
  'u_segMask',
  'u_perfBox',
  'u_motion',
  'u_segMix', // SAM tail guard: 0 = gallery-untouched no-op
] as const;

function read(id: string, ext: 'glsl' | 'ts'): string {
  return readFileSync(join(HERE, `${id}.${ext}`), 'utf8');
}

function declaredUniforms(glsl: string): Set<string> {
  const out = new Set<string>();
  for (const m of glsl.matchAll(/uniform\s+\w+\s+(\w+)/g)) out.add(m[1]);
  return out;
}

describe('Batch-3 uniform contract', () => {
  for (const id of SHADERS) {
    test(`${id}: declares the full contract + quality knob`, () => {
      const glsl = read(id, 'glsl');
      expect(glsl).toContain('void main');
      const declared = declaredUniforms(glsl);
      for (const u of CONTRACT) {
        expect(declared.has(u), `${id} must declare ${u}`).toBe(true);
      }
      expect(glsl).toContain('u_palette[4]');
      expect(glsl).toContain('AEI_QUALITY');
    });

    test(`${id}: colours from u_palette, never hardcoded`, () => {
      const glsl = read(id, 'glsl');
      expect(glsl).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(glsl).not.toMatch(/[^a-zA-Z]0x[0-9a-fA-F]+\b/);
    });

    test(`${id}: registry uniforms all exist in the GLSL`, () => {
      const ts = read(id, 'ts');
      const glsl = read(id, 'glsl');
      const declared = declaredUniforms(glsl);
      const listed = ts.match(/'u_[a-zA-Z0-9]+'/g) ?? [];
      expect(listed.length).toBeGreaterThan(0);
      for (const q of listed) {
        const name = q.slice(1, -1);
        expect(declared.has(name), `${id}: ${name} listed but not declared`).toBe(true);
      }
    });

    test(`${id}: library tag + valid director metadata`, () => {
      const ts = read(id, 'ts');
      expect(ts).toContain(`tags: ['${LIB_TAG}']`);
      expect(ts).toMatch(/themeTags:\s*\['[^']+'(,\s*'[^']+')*\]/);
      expect(ts).toMatch(/moods:\s*\['[^']+'(,\s*'[^']+')*\]/);
      const m = ts.match(/energyRange:\s*\[([0-9.]+),\s*([0-9.]+)\]/);
      expect(m, `${id} needs energyRange: [lo, hi]`).not.toBeNull();
      const lo = Number(m![1]);
      const hi = Number(m![2]);
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(1);
      expect(lo).toBeLessThanOrEqual(hi);
    });

    test(`${id}: params satisfy min <= def <= max`, () => {
      const ts = read(id, 'ts');
      const params = [...ts.matchAll(/min:\s*(-?[0-9.]+),\s*max:\s*(-?[0-9.]+),\s*def:\s*(-?[0-9.]+)/g)];
      expect(params.length).toBeGreaterThan(0);
      for (const p of params) {
        const min = Number(p[1]);
        const max = Number(p[2]);
        const def = Number(p[3]);
        expect(min).toBeLessThanOrEqual(def);
        expect(def).toBeLessThanOrEqual(max);
      }
    });

    test(`${id}: braces, parens and #if blocks balance`, () => {
      const glsl = read(id, 'glsl');
      const code = glsl.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
      for (const [open, close] of [['{', '}'], ['(', ')']] as const) {
        const opens = code.split(open).length - 1;
        const closes = code.split(close).length - 1;
        expect(opens, `${id}: unbalanced ${open}${close}`).toBe(closes);
      }
      const ifs = code.match(/^\s*#if\b/gm)?.length ?? 0;
      const endifs = code.match(/^\s*#endif\b/gm)?.length ?? 0;
      expect(ifs).toBeGreaterThan(0); // quality knob must be used, not just declared
      expect(endifs, `${id}: unbalanced #if/#endif`).toBe(ifs);
    });

    test(`${id}: passes the registration gate`, () => {
      const glsl = read(id, 'glsl');
      const r = verifyVisualizer({
        id,
        name: id,
        fragmentGlsl: glsl,
        uniforms: [...CONTRACT],
        tags: [LIB_TAG],
        params: [],
      });
      expect(r).toEqual({ ok: true, errors: [] });
    });
  }
});
