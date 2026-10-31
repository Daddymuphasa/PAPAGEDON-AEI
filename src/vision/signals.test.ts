import { describe, expect, test } from 'vitest';
import type { SegResultData } from '../types';
import {
  SEG_GRID_W,
  coverageOf,
  decodeGrid,
  emptyResult,
  encodeGrid,
  fadeAfterStale,
  motionBetween,
  rasterizeChannel,
  segGridHeight,
  smoothBox,
  smoothValue,
  verifySegResult,
} from './signals';

describe('rasterizeChannel', () => {
  test('fills box-only detections', () => {
    const grid = rasterizeChannel([{ box: { x0: 0, y0: 0, x1: 0.5, y1: 1 }, mask: null }], 4, 4);
    expect(Array.from(grid).join('')).toBe('1100110011001100');
  });

  test('splats decoded masks into the box region', () => {
    const grid = rasterizeChannel(
      [
        {
          box: { x0: 0, y0: 0, x1: 1, y1: 1 },
          mask: { raster: new Uint8Array([1, 1, 1, 1]), w: 2, h: 2 },
        },
      ],
      4,
      4,
    );
    // Four mask-pixel centers land on grid cells (1,1),(3,1),(1,3),(3,3).
    expect(Array.from(grid).join('')).toBe('0000010100000101');
    expect(coverageOf(grid)).toBe(0.25);
  });

  test('falls back to the box when the raster is short', () => {
    const grid = rasterizeChannel(
      [{ box: { x0: 0, y0: 0, x1: 1, y1: 1 }, mask: { raster: new Uint8Array([1]), w: 4, h: 4 } }],
      4,
      4,
    );
    expect(coverageOf(grid)).toBe(1);
  });
});

describe('coverageOf / motionBetween', () => {
  test('coverage is the lit share', () => {
    expect(coverageOf(new Uint8Array([1, 1, 0, 0]))).toBe(0.5);
    expect(coverageOf(new Uint8Array(0))).toBe(0);
  });

  test('motion is the changed share', () => {
    expect(motionBetween(new Uint8Array([1, 1, 0, 0]), new Uint8Array([1, 1, 0, 0]))).toBe(0);
    expect(motionBetween(new Uint8Array([1, 1, 0, 0]), new Uint8Array([1, 0, 0, 1]))).toBe(0.5);
  });

  test('mismatched sizes report still, never spike', () => {
    expect(motionBetween(new Uint8Array(4), new Uint8Array(8))).toBe(0);
  });
});

describe('smoothing / fade', () => {
  test('values ease toward the read', () => {
    expect(smoothValue(0, 1)).toBe(0.5);
    expect(smoothValue(0.5, 1, 0.25)).toBe(0.625);
  });

  test('boxes ease, hold on a miss, adopt on first sight', () => {
    const a = { x0: 0, y0: 0, x1: 0.2, y1: 0.2 };
    const b = { x0: 0.2, y0: 0.2, x1: 0.4, y1: 0.4 };
    const eased = smoothBox(a, b);
    expect(eased?.x0).toBeCloseTo(0.1, 9);
    expect(eased?.y0).toBeCloseTo(0.1, 9);
    expect(eased?.x1).toBeCloseTo(0.3, 9);
    expect(eased?.y1).toBeCloseTo(0.3, 9);
    expect(smoothBox(a, null)).toBe(a);
    expect(smoothBox(null, b)).toEqual(b);
  });

  test('fresh masks hold 10s then fade over 2s', () => {
    expect(fadeAfterStale(0)).toBe(1);
    expect(fadeAfterStale(9999)).toBe(1);
    expect(fadeAfterStale(11_000)).toBe(0.5);
    expect(fadeAfterStale(12_000)).toBe(0);
    expect(fadeAfterStale(60_000)).toBe(0);
  });
});

describe('grid transport', () => {
  test('encode/decode round-trips, rejects wrong sizes', () => {
    const grid = new Uint8Array([1, 0, 1, 0, 0, 1]);
    const b64 = encodeGrid(grid);
    expect(Array.from(decodeGrid(b64, 3, 2) ?? [])).toEqual(Array.from(grid));
    expect(decodeGrid(b64, 2, 2)).toBeNull();
    expect(decodeGrid('!!!not-base64!!!', 2, 2)).toBeNull();
  });

  test('grid height follows the frame aspect', () => {
    expect(segGridHeight(640, 480)).toBe(96);
    expect(segGridHeight(640, 640)).toBe(128);
    expect(segGridHeight(0, 0)).toBe(96);
  });
});

describe('verifySegResult', () => {
  const good = (): SegResultData => emptyResult(8, 8);

  test('accepts the empty result', () => {
    expect(verifySegResult(good())).toEqual({ ok: true, errors: [] });
  });

  test('rejects bad dims, out-of-range boxes, count mismatch', () => {
    const dims = good();
    dims.crowd.mask = { w: SEG_GRID_W + 1, h: 8, data: '' };
    expect(verifySegResult(dims).ok).toBe(false);
    const box = good();
    box.performer.boxes = [{ x0: 0, y0: 0, x1: 2, y1: 1 }];
    box.performer.count = 1;
    expect(verifySegResult(box).ok).toBe(false);
    const count = good();
    count.crowd.count = 3;
    expect(verifySegResult(count).ok).toBe(false);
    expect(verifySegResult(null).ok).toBe(false);
  });
});
