// Colour roles: flyer inks map to stable jobs, the background never
// becomes the primary, variation never moves the primary, easing glides.
import { describe, expect, test } from 'vitest';
import {
  applyPaletteVariation,
  coerceRoles,
  deriveRoles,
  easePaletteToward,
  fillSlots,
  hexToHsl,
  hueDistance,
  rolesToDisplayPalette,
} from './roles';

describe('deriveRoles', () => {
  test('red-on-black flyer: dark wall, red primary, bright sparks', () => {
    const r = deriveRoles(['#000000', '#cc1122', '#881122', '#ff5566']);
    const [, , bgL] = hexToHsl(r.background);
    expect(bgL).toBeLessThanOrEqual(0.12);
    const [pH, pS] = hexToHsl(r.primary);
    expect(hueDistance(pH, hexToHsl('#cc1122')[0])).toBeLessThan(1 / 12);
    expect(pS).toBeGreaterThan(0.3);
    const [, , hiL] = hexToHsl(r.highlight);
    expect(hiL).toBeGreaterThanOrEqual(0.6);
  });

  test('white-background flyer keeps a dark wall and an ink primary', () => {
    const r = deriveRoles(['#ffffff', '#f5f5f5', '#1435ff', '#0a0a0a']);
    const [, , bgL] = hexToHsl(r.background);
    expect(bgL).toBeLessThanOrEqual(0.12);
    const [, pS, pL] = hexToHsl(r.primary);
    expect(pS).toBeGreaterThan(0.2);
    expect(pL).toBeLessThan(0.85);
  });

  test('secondary and accent are distinct hues from the primary', () => {
    const r = deriveRoles(['#101010', '#ff2d78', '#00e5ff', '#ffd166', '#7b2dff', '#39ff14']);
    const [pH] = hexToHsl(r.primary);
    const [sH] = hexToHsl(r.secondary);
    const [aH] = hexToHsl(r.accent);
    expect(hueDistance(pH, sH)).toBeGreaterThanOrEqual(1 / 12);
    expect(hueDistance(pH, aH)).toBeGreaterThanOrEqual(1 / 12);
  });

  test('area weights break saturation ties toward the bigger ink', () => {
    const pal = ['#101010', '#ff8800', '#0088ff'];
    const light = deriveRoles(pal, [0.7, 0.25, 0.05]);
    const heavy = deriveRoles(pal, [0.1, 0.05, 0.85]);
    expect(hexToHsl(light.primary)[0]).toBeCloseTo(hexToHsl('#ff8800')[0], 1);
    expect(hexToHsl(heavy.primary)[0]).toBeCloseTo(hexToHsl('#0088ff')[0], 1);
  });

  test('garbage in still yields five valid hex roles', () => {
    const r = deriveRoles(['nope', '', '#12345']);
    for (const c of [r.background, r.primary, r.secondary, r.accent, r.highlight]) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('coerceRoles', () => {
  test('repairs a model roles object with a washed-out primary', () => {
    const r = coerceRoles(
      ['#0a0a0a', '#ff2d78', '#00e5ff'],
      { background: '#000000', primary: '#f0f0f0', secondary: '#00e5ff', accent: '#7b2dff', highlight: '#ffffff' },
    );
    const [, pS] = hexToHsl(r.primary);
    expect(pS).toBeGreaterThan(0.2);
  });

  test('fills missing roles from the palette for old cached themes', () => {
    const r = coerceRoles(['#0a0a0a', '#ff2d78', '#00e5ff'], undefined);
    expect(r.primary).toBe(deriveRoles(['#0a0a0a', '#ff2d78', '#00e5ff']).primary);
  });
});

describe('rolesToDisplayPalette', () => {
  test('returns primary-first shader slots', () => {
    const p = rolesToDisplayPalette({ palette: ['#000000', '#cc1122', '#00e5ff', '#ffd166'] });
    expect(p).toHaveLength(4);
    expect(p[0]).toBe(deriveRoles(['#000000', '#cc1122', '#00e5ff', '#ffd166']).primary);
  });
});

describe('applyPaletteVariation', () => {
  const slots = ['#111111', '#222222', '#333333', '#444444'];

  test('slot 0 (primary) never moves, whatever the emphasis', () => {
    for (let e = 0; e < 8; e++) {
      expect(applyPaletteVariation(slots, e)[0]).toBe('#111111');
    }
  });

  test('emphasis permutes the back three slots deterministically', () => {
    expect(applyPaletteVariation(slots, 0)).toEqual(['#111111', '#222222', '#333333', '#444444']);
    expect(applyPaletteVariation(slots, 1)).toEqual(['#111111', '#333333', '#444444', '#222222']);
    expect(applyPaletteVariation(slots, 2)).toEqual(['#111111', '#444444', '#222222', '#333333']);
    expect(applyPaletteVariation(slots, 3)).toEqual(['#111111', '#222222', '#444444', '#333333']);
  });
});

describe('fillSlots', () => {
  test('short palettes repeat the nearest slot, never black', () => {
    expect(fillSlots(['#aabbcc'])).toEqual(['#aabbcc', '#aabbcc', '#aabbcc', '#aabbcc']);
    expect(fillSlots([])).not.toContain('#000000');
  });
});

describe('easePaletteToward', () => {
  test('glides monotonically and lands exactly on the target', () => {
    const from = ['#000000', '#000000', '#000000', '#000000'];
    const to = ['#ffffff', '#ff0000', '#00ff00', '#0000ff'];
    let shown = [...from];
    let prev = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 200; i++) {
      shown = easePaletteToward(shown, to, 0.1);
      const dist = shown.reduce((acc, c, j) => {
        const [h1] = hexToHsl(c);
        const [h2] = hexToHsl((to[j] as string).toLowerCase());
        return acc + Math.abs(h1 - h2);
      }, 0);
      expect(dist).toBeLessThanOrEqual(prev + 1e-9);
      prev = dist;
    }
    expect(easePaletteToward(shown, to, 1)).toEqual(to.map((c) => c.toLowerCase()));
  });
});
