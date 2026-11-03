// Flyer resilience: the offline fallback builds a well-formed, plain-valid
// theme from pixels alone, and request failures carry precise codes.
import { describe, expect, test } from 'vitest';
import { CATALOG_IDS } from '../../../shaders/catalog';
import { offlineThemeFromSample } from './applyTheme';
import { FlyerError } from './flyer';
import type { FlyerSample } from './samplePalette';
import { verifyThemePlain } from './verifyTheme';

function sample(): FlyerSample {
  return {
    palette: ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166', '#0b0b10', '#ffffff'],
    weights: [0.35, 0.25, 0.15, 0.1, 0.1, 0.05],
    energy: 0.82,
    motifs: ['neon', 'crowd'],
  };
}

describe('offline flyer fallback', () => {
  test('offline theme passes the plain checks', () => {
    const theme = offlineThemeFromSample(sample(), 'lagos-neon-nights.jpg');
    expect(theme.eventName).toBe('lagos neon nights');
    expect(theme.palette).toEqual(sample().palette);
    expect(theme.energy).toBeCloseTo(0.82);
    const plain = verifyThemePlain(theme, [...CATALOG_IDS]);
    expect(plain.ok).toBe(true);
  });

  test('suggested ids come from the catalog', () => {
    const theme = offlineThemeFromSample(sample());
    expect(theme.suggestedShaderIds.length).toBeGreaterThan(0);
    for (const id of theme.suggestedShaderIds) {
      expect(CATALOG_IDS).toContain(id);
    }
  });
});

describe('flyer errors', () => {
  test('FlyerError carries step, code and status', () => {
    const err = new FlyerError('theme', 'key-rejected', 502);
    expect(err).toBeInstanceOf(Error);
    expect(err.step).toBe('theme');
    expect(err.code).toBe('key-rejected');
    expect(err.status).toBe(502);
    expect(err.message).toContain('502');
  });
});
