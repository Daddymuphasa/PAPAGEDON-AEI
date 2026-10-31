import { describe, expect, test } from 'vitest';
import { hexToRgb, paletteMatchPass, paletteMatchScore, type Rgb } from './paletteCheck';

const PALETTE = ['#ff2d78', '#00e5ff'];

describe('hexToRgb', () => {
  test('parses hex colours', () => {
    expect(hexToRgb('#ff2d78')).toEqual([255, 45, 120]);
    expect(hexToRgb('00e5ff')).toEqual([0, 229, 255]);
  });

  test('rejects junk', () => {
    expect(hexToRgb('red')).toBeNull();
    expect(hexToRgb('#zzz')).toBeNull();
    expect(hexToRgb('')).toBeNull();
  });
});

describe('paletteMatchScore', () => {
  test('scores exact palette pixels at 1', () => {
    const px: Rgb[] = [
      [255, 45, 120],
      [0, 229, 255],
      [250, 50, 115],
    ];
    expect(paletteMatchScore(px, PALETTE)).toBe(1);
  });

  test('scores foreign pixels at 0', () => {
    const px: Rgb[] = [
      [0, 128, 0],
      [120, 60, 10],
    ];
    expect(paletteMatchScore(px, PALETTE)).toBe(0);
  });

  test('scores mixed samples proportionally', () => {
    const px: Rgb[] = [
      [255, 45, 120],
      [0, 229, 255],
      [0, 128, 0],
      [120, 60, 10],
    ];
    expect(paletteMatchScore(px, PALETTE)).toBe(0.5);
  });

  test('empty pixels or palette score 0', () => {
    expect(paletteMatchScore([], PALETTE)).toBe(0);
    expect(paletteMatchScore([[255, 45, 120]], [])).toBe(0);
  });
});

describe('paletteMatchPass', () => {
  test('passes a mostly-matching render, fails a foreign one', () => {
    const good: Rgb[] = Array.from({ length: 10 }, () => [255, 45, 120] as Rgb);
    const bad: Rgb[] = Array.from({ length: 10 }, () => [0, 128, 0] as Rgb);
    expect(paletteMatchPass(good, PALETTE).pass).toBe(true);
    expect(paletteMatchPass(bad, PALETTE).pass).toBe(false);
  });
});
