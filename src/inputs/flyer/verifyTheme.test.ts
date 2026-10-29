import { describe, expect, test } from 'vitest';
import type { EventTheme } from '../../types';
import { MAX_RETRIES, verifyThemePlain } from './verifyTheme';

const IDS = ['example-bass-pulse', 'rings-two'];

function validTheme(): EventTheme {
  return {
    eventName: 'Lagos Neon Nights',
    genre: 'Afrobeats',
    mood: 'electric',
    palette: ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'],
    energy: 0.85,
    motifs: ['neon', 'waves'],
    typographyFeel: 'bold condensed glow',
    tempoBpm: { min: 95, max: 125 },
    sceneSwitchSeconds: { min: 4, max: 12 },
    suggestedShaderIds: ['example-bass-pulse'],
  };
}

describe('verifyThemePlain', () => {
  test('accepts a valid theme', () => {
    expect(verifyThemePlain(validTheme(), IDS)).toEqual({ ok: true, errors: [] });
  });

  test('rejects a non-object', () => {
    expect(verifyThemePlain(null, IDS).ok).toBe(false);
    expect(verifyThemePlain('nope', IDS).ok).toBe(false);
  });

  test('rejects missing required fields', () => {
    const t = validTheme() as unknown as Record<string, unknown>;
    delete t.genre;
    t.mood = '  ';
    const r = verifyThemePlain(t, IDS);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('missing or empty: genre');
    expect(r.errors).toContain('missing or empty: mood');
  });

  test('rejects bad hex colours and wrong palette size', () => {
    const short = { ...validTheme(), palette: ['#ff2d78', 'red'] };
    const r1 = verifyThemePlain(short, IDS);
    expect(r1.ok).toBe(false);
    expect(r1.errors.some((e) => e.startsWith('palette must hold'))).toBe(true);

    const badHex = { ...validTheme(), palette: ['#ff2d78', '#7b2dff', 'not-a-colour'] };
    const r2 = verifyThemePlain(badHex, IDS);
    expect(r2.ok).toBe(false);
    expect(r2.errors).toContain('invalid hex colour: not-a-colour');
  });

  test('rejects unknown shader ids', () => {
    const t = { ...validTheme(), suggestedShaderIds: ['example-bass-pulse', 'ghost-shader'] };
    const r = verifyThemePlain(t, IDS);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('unknown shader id: ghost-shader');
  });

  test('rejects empty shader suggestions', () => {
    const t = { ...validTheme(), suggestedShaderIds: [] };
    expect(verifyThemePlain(t, IDS).ok).toBe(false);
  });

  test('rejects out-of-bounds tempo', () => {
    const t = { ...validTheme(), tempoBpm: { min: 40, max: 300 } };
    const r = verifyThemePlain(t, IDS);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('tempoBpm must stay within 60-180');
  });

  test('rejects inverted tempo range', () => {
    const t = { ...validTheme(), tempoBpm: { min: 130, max: 100 } };
    const r = verifyThemePlain(t, IDS);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('tempoBpm.min must not exceed tempoBpm.max');
  });

  test('rejects out-of-bounds scene-switch timing', () => {
    const t = { ...validTheme(), sceneSwitchSeconds: { min: 0.5, max: 120 } };
    const r = verifyThemePlain(t, IDS);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('sceneSwitchSeconds must stay within 2-30');
  });

  test('rejects bad energy and oversized motifs', () => {
    const t = { ...validTheme(), energy: 2, motifs: Array.from({ length: 20 }, (_, i) => `m${i}`) };
    const r = verifyThemePlain(t, IDS);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('energy must be a number 0-1');
    expect(r.errors.some((e) => e.startsWith('motifs must be'))).toBe(true);
  });

  test('retry budget is 3', () => {
    expect(MAX_RETRIES).toBe(3);
  });
});
