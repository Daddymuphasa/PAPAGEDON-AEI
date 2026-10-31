import { describe, expect, test } from 'vitest';
import { fallbackGradientStops } from './fallback';

const PALETTE = ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'];

describe('fallbackGradientStops', () => {
  test('spans the full gradient with palette colours', () => {
    const stops = fallbackGradientStops(PALETTE, 'peak');
    expect(stops.length).toBeGreaterThanOrEqual(2);
    expect(stops[0].offset).toBe(0);
    expect(stops[stops.length - 1].offset).toBe(1);
    for (const s of stops) expect(PALETTE).toContain(s.color);
    const offsets = stops.map((s) => s.offset);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });

  test('rotates per energy tag', () => {
    const calm = fallbackGradientStops(PALETTE, 'calm').map((s) => s.color);
    const peak = fallbackGradientStops(PALETTE, 'peak').map((s) => s.color);
    expect(calm).not.toEqual(peak);
    expect(new Set(peak).size).toBe(4);
  });

  test('survives a junk palette', () => {
    const stops = fallbackGradientStops(['red', ''], 'drop');
    expect(stops.length).toBeGreaterThanOrEqual(2);
    expect(stops[0].offset).toBe(0);
    expect(stops[stops.length - 1].offset).toBe(1);
  });
});
