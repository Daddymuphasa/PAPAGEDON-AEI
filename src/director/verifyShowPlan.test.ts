import { describe, expect, test } from 'vitest';
import { verifyShowPlan } from './verifyShowPlan';

const DEFS = [
  {
    id: 'hex-core',
    params: [
      { key: 'p1', label: 'Ripple', min: 0, max: 2, def: 1 },
      { key: 'p2', label: 'Core', min: 0.1, max: 0.6, def: 0.28 },
      { key: 'p3', label: 'Glow', min: 0, max: 1.5, def: 1 },
    ],
  },
  {
    id: 'warp-tunnel',
    params: [
      { key: 'p1', label: 'Twist', min: 0, max: 2, def: 0.6 },
      { key: 'p2', label: 'Rings', min: 0.5, max: 2.5, def: 1 },
      { key: 'p3', label: 'Warp', min: 0, max: 1.5, def: 0.8 },
    ],
  },
];

function validPlan() {
  return {
    visualId: 'hex-core',
    params: [1, 0.28, 1] as [number, number, number],
    intensity: 0.7,
    speed: 1,
    paletteEmphasis: 0,
    transition: { type: 'crossfade', durationMs: 600 },
    energyArc: 'peak',
    sectionSeconds: 30,
    reason: 'High energy peak over the neon theme',
  };
}

describe('verifyShowPlan', () => {
  test('accepts a valid plan', () => {
    expect(verifyShowPlan(validPlan(), DEFS, ['warp-tunnel'])).toEqual({ ok: true, errors: [] });
  });

  test('rejects an unknown visual', () => {
    const r = verifyShowPlan({ ...validPlan(), visualId: 'ghost' }, DEFS, []);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('unknown visualId: ghost');
  });

  test('rejects params outside declared ranges', () => {
    const r = verifyShowPlan({ ...validPlan(), params: [1, 9, 1] }, DEFS, []);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('param 1 out of range 0.1-0.6');
  });

  test('rejects a bad transition', () => {
    const r = verifyShowPlan(
      { ...validPlan(), transition: { type: 'wipe', durationMs: 5000 } },
      DEFS,
      [],
    );
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('transition.type must be one of crossfade, cut, flash-cut');
    expect(r.errors).toContain('transition.durationMs must be 0-2000');
  });

  test('rejects a third repeat in a row', () => {
    const r = verifyShowPlan(validPlan(), DEFS, ['hex-core', 'hex-core']);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('visual hex-core would repeat more than twice in a row');
  });

  test('allows a second showing in a row', () => {
    expect(verifyShowPlan(validPlan(), DEFS, ['warp-tunnel', 'hex-core']).ok).toBe(true);
  });

  test('rejects bad arc, section and reason', () => {
    const r = verifyShowPlan(
      { ...validPlan(), energyArc: 'nap', sectionSeconds: 5, reason: '  ' },
      DEFS,
      [],
    );
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('energyArc must be one of build, peak, sustain, breakdown, release');
    expect(r.errors).toContain('sectionSeconds must be 10-60');
    expect(r.errors).toContain('missing or empty: reason');
  });

  test('rejects bad intensity, speed and emphasis', () => {
    const r = verifyShowPlan(
      { ...validPlan(), intensity: 2, speed: -1, paletteEmphasis: 7 },
      DEFS,
      [],
    );
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('intensity must be 0-1');
    expect(r.errors).toContain('speed must be 0-2');
    expect(r.errors).toContain('paletteEmphasis must be an integer 0-3');
  });
});
