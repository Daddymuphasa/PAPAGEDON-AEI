// Originals registry + adapter tests: the nine stay nine, stay ordered, and
// every entry resolves to a ported pack/builder. The three.js scenes
// themselves verify only in a browser (in-app 3D check) — never here.
import { describe, expect, test } from 'vitest';
import { adaptSignals, createBeatHold } from './adapter';
import { SCULPTURAL_BUILDERS } from './hex/sculptural';
import { SURFACE_PACKS, SCULPTURAL_PACKS, VISUALIZER_PACKS, isSculpturalPack } from './hex/packs';
import { ORIGINAL_DEFS, ORIGINAL_IDS, ORIGINALS, ORIGINALS_PACK, originalIdFromFile } from './originals';
import { emptySignals } from '../lib/papagedon/analyzer';

describe('originals registry', () => {
  test('nine originals, unique ids, calm-to-peak order', () => {
    expect(ORIGINALS).toHaveLength(9);
    expect(new Set(ORIGINAL_IDS).size).toBe(9);
    expect(ORIGINAL_IDS).toEqual(ORIGINALS.map((e) => e.id));
    const orders = ORIGINALS.map((e) => e.order);
    expect([...orders].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(ORIGINALS[0].variantId).toBe('liquid-mirror');
    expect(ORIGINALS[8].variantId).toBe('electric-nexus');
  });

  test('entries are well-formed', () => {
    for (const e of ORIGINALS) {
      expect(e.name.trim().length).toBeGreaterThan(0);
      expect(e.themeTags.length).toBeGreaterThan(0);
      expect(e.moods.length).toBeGreaterThan(0);
      const [lo, hi] = e.energyRange;
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(1);
      expect(lo).toBeLessThanOrEqual(hi);
    }
  });

  test('every original resolves to a ported pack and builder', () => {
    expect(SURFACE_PACKS).toHaveLength(7);
    expect(SCULPTURAL_PACKS).toHaveLength(2);
    for (const e of ORIGINALS) {
      const pack = VISUALIZER_PACKS.find((p) => p.id === e.variantId);
      expect(pack, `missing pack: ${e.variantId}`).toBeDefined();
      expect(isSculpturalPack(pack!), `kind drift: ${e.variantId}`).toBe(e.kind === 'sculptural');
      if (e.kind === 'sculptural' && pack && isSculpturalPack(pack)) {
        expect(SCULPTURAL_BUILDERS[pack.sceneMode], `missing builder: ${pack.sceneMode}`).toBeDefined();
      }
    }
  });

  test('stage pack mirrors the registry with three: files', () => {
    expect(ORIGINALS_PACK.id).toBe('OriginalsPack');
    expect(ORIGINALS_PACK.shaders).toHaveLength(9);
    for (const [i, s] of ORIGINALS_PACK.shaders.entries()) {
      expect(s.id).toBe(ORIGINALS[i].id);
      expect(s.name).toBe(ORIGINALS[i].name);
      expect(originalIdFromFile(s.file)).toBe(s.id);
    }
    expect(originalIdFromFile('shaders/SignaturePack/01_aurora.frag')).toBeNull();
    expect(originalIdFromFile('three:originals/nope')).toBeNull();
  });

  test('director defs mirror the registry', () => {
    expect(ORIGINAL_DEFS).toHaveLength(9);
    for (const [i, d] of ORIGINAL_DEFS.entries()) {
      expect(d.id).toBe(ORIGINALS[i].id);
      expect(d.name).toBe(ORIGINALS[i].name);
      expect(d.tags).toEqual(ORIGINALS[i].themeTags);
      expect(d.meta?.energyRange).toEqual(ORIGINALS[i].energyRange);
    }
  });
});

describe('originals signal adapter', () => {
  test('beat hold rises on beats and decays after', () => {
    const hold = createBeatHold();
    const beat = { ...emptySignals(), energy: 0.8, bass: 0.9, mid: 0.5, treble: 0.4, beat: true };
    const first = adaptSignals(beat, hold);
    expect(first.beat).toBe(1);
    expect(first.pulse).toBeCloseTo(0.9);
    const quiet = { ...emptySignals(), beat: false };
    const second = adaptSignals(quiet, hold);
    expect(second.beat).toBeCloseTo(0.9);
    expect(second.pulse).toBe(0);
    for (let i = 0; i < 20; i += 1) adaptSignals(quiet, hold);
    expect(adaptSignals(quiet, hold).beat).toBe(0);
  });

  test('bands clamp to 0..1 and survive garbage', () => {
    const hold = createBeatHold();
    const out = adaptSignals(
      { ...emptySignals(), energy: 3, bass: -2, mid: Number.NaN, treble: Infinity, beat: false },
      hold,
    );
    expect(out.energy).toBe(1);
    expect(out.bass).toBe(0);
    expect(out.mid).toBe(0);
    expect(out.treble).toBe(0);
  });
});
