// Flyer sampling: real palette/energy/motifs from banner pixels, mock
// theme enhancement against the catalog, and library registration.
import { describe, expect, test } from 'vitest';
import type { EventTheme } from '../../types';
import { listShaders } from '../../../shaders/registry';
import { registerLibrary } from '../../../shaders/library';
import { CATALOG } from '../../../shaders/catalog';
import { enhanceMockTheme, samplePaletteFromPixels, type CatalogLike, type FlyerSample } from './samplePalette';

function solid(w: number, h: number, r: number, g: number, b: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < w * h; i++) out.push(r, g, b, 255);
  return out;
}

const BASE: EventTheme = {
  eventName: 'X',
  genre: 'X',
  mood: 'X',
  palette: ['#111111', '#222222', '#333333', '#444444'],
  energy: 0.5,
  motifs: ['x'],
  typographyFeel: 'plain',
  tempoBpm: { min: 100, max: 120 },
  sceneSwitchSeconds: { min: 4, max: 12 },
  suggestedShaderIds: ['hex-core'],
};

function def(id: string, themeTags: string[] = [], energyRange: [number, number] = [0, 1], moods: string[] = []): CatalogLike {
  return { id, themeTags, energyRange, moods };
}

function sample(over: Partial<FlyerSample> = {}): FlyerSample {
  return {
    palette: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
    weights: [0.4, 0.2, 0.15, 0.1, 0.1, 0.05],
    energy: 0.9,
    motifs: ['neon', 'night'],
    ...over,
  };
}

describe('samplePaletteFromPixels', () => {
  test('solid red yields a red dominant colour and fire/festival motifs', () => {
    const s = samplePaletteFromPixels(solid(4, 4, 255, 0, 0), 4, 4);
    expect(s.palette[0]).toBe('#ff0000');
    expect(s.motifs).toContain('fire');
    expect(s.motifs).toContain('festival');
    expect(s.energy).toBeGreaterThan(0.8);
  });

  test('dark banner with neon block yields neon/night motifs', () => {
    const px: number[] = [];
    for (let i = 0; i < 100; i++) {
      const neon = i < 20;
      px.push(...(neon ? [0, 255, 80, 255] : [10, 10, 20, 255]));
    }
    const s = samplePaletteFromPixels(px, 10, 10);
    expect(s.motifs).toContain('neon');
    expect(s.motifs).toContain('night');
  });

  test('always returns 6 valid hex colours, weights and bounded energy', () => {
    const s = samplePaletteFromPixels(solid(8, 8, 120, 90, 200), 8, 8);
    expect(s.palette).toHaveLength(6);
    expect(s.weights).toHaveLength(6);
    for (const c of s.palette) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(s.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(s.energy).toBeGreaterThanOrEqual(0);
    expect(s.energy).toBeLessThanOrEqual(1);
    expect(s.motifs.length).toBeLessThanOrEqual(4);
  });
});

describe('enhanceMockTheme', () => {
  const defs = [
    def('a-neon', ['neon'], [0.8, 1.0], ['electric']),
    def('b-calm', ['doves'], [0.0, 0.2], ['gentle']),
    def('c-plain'),
  ];

  test('replaces palette/energy/mood/roles and suggests matching catalog ids', () => {
    const t = enhanceMockTheme(BASE, sample(), defs);
    expect(t.palette).toEqual(sample().palette);
    expect(t.energy).toBe(0.9);
    expect(t.mood).toBe('rave');
    expect(t.roles).toBeDefined();
    expect(t.suggestedShaderIds[0]).toBe('a-neon');
    for (const id of t.suggestedShaderIds) {
      expect(defs.map((d) => d.id)).toContain(id);
    }
  });

  test('names the event from the flyer file, untitled without one', () => {
    expect(enhanceMockTheme(BASE, sample(), defs).eventName).toBe('Untitled Event');
    expect(enhanceMockTheme(BASE, sample(), defs, { fileName: 'lagos-neon-nights.jpg' }).eventName).toBe('lagos neon nights');
  });

  test('suggests up to 8 catalog ids by default', () => {
    const t = enhanceMockTheme(BASE, sample(), CATALOG);
    expect(t.suggestedShaderIds.length).toBeLessThanOrEqual(8);
    expect(t.suggestedShaderIds.length).toBeGreaterThan(3);
    for (const id of t.suggestedShaderIds) {
      expect(CATALOG.map((d) => d.id)).toContain(id);
    }
  });

  test('falls back to base ids when the catalog is empty', () => {
    const t = enhanceMockTheme(BASE, sample(), []);
    expect(t.suggestedShaderIds).toEqual(['hex-core']);
  });
});

describe('registerLibrary', () => {
  test('registers every def so verification sees real ids', () => {
    registerLibrary([
      { id: 'x-one', name: 'x-one', fragmentGlsl: '', uniforms: [] },
      { id: 'x-two', name: 'x-two', fragmentGlsl: '', uniforms: [] },
    ]);
    const ids = listShaders().map((s) => s.id);
    expect(ids).toContain('x-one');
    expect(ids).toContain('x-two');
  });
});
