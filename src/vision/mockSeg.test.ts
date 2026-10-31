import { describe, expect, test } from 'vitest';
import { coverageOf, motionBetween } from './signals';
import { mockCrowdBoxes, mockSegFrame } from './mockSeg';

describe('mockSegFrame', () => {
  test('fills both channels at the requested size', () => {
    const f = mockSegFrame(0, 32, 24);
    expect(f.perf.length).toBe(32 * 24);
    expect(f.crowd.length).toBe(32 * 24);
    expect(coverageOf(f.perf)).toBeGreaterThan(0);
    expect(coverageOf(f.crowd)).toBeGreaterThan(0);
    expect(f.performerCount).toBe(1);
    expect(f.crowdCount).toBeGreaterThan(0);
  });

  test('the performer drifts and the crowd ripples with time', () => {
    const a = mockSegFrame(0, 32, 24);
    const b = mockSegFrame(2.5, 32, 24);
    expect(a.box.x0).not.toBe(b.box.x0);
    expect(motionBetween(a.perf, b.perf)).toBeGreaterThan(0);
    expect(motionBetween(a.crowd, b.crowd)).toBeGreaterThan(0);
  });

  test('is deterministic in time', () => {
    const a = mockSegFrame(7, 32, 24);
    const b = mockSegFrame(7, 32, 24);
    expect(Array.from(a.perf)).toEqual(Array.from(b.perf));
    expect(a.box).toEqual(b.box);
  });

  test('the crowd stays in the lower frame', () => {
    const f = mockSegFrame(3, 32, 24);
    let upper = 0;
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 32; x++) upper += f.crowd[y * 32 + x];
    }
    expect(upper).toBe(0);
  });

  test('crowd boxes are twelve ordered in-range boxes', () => {
    const boxes = mockCrowdBoxes(1);
    expect(boxes.length).toBe(12);
    for (const b of boxes) {
      expect(b.x0).toBeGreaterThanOrEqual(0);
      expect(b.y0).toBeGreaterThanOrEqual(0);
      expect(b.x1).toBeLessThanOrEqual(1);
      expect(b.y1).toBeLessThanOrEqual(1);
      expect(b.x1).toBeGreaterThan(b.x0);
      expect(b.y1).toBeGreaterThan(b.y0);
    }
  });
});
