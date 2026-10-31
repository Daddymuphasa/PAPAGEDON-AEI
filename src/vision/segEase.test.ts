import { describe, expect, test } from 'vitest';
import { SegEaser, type SegEaseTarget } from './segEase';

function target(patch?: Partial<SegEaseTarget>): SegEaseTarget {
  return {
    perf: new Uint8Array([1, 0, 0, 0]),
    crowd: new Uint8Array([0, 0, 0, 1]),
    w: 2,
    h: 2,
    box: [0.1, 0.2, 0.3, 0.4],
    motion: 0.8,
    strength: 0.5,
    ...patch,
  };
}

describe('SegEaser', () => {
  test('returns null without a target', () => {
    expect(new SegEaser().frame(16, 1000)).toBeNull();
    expect(new SegEaser().hasTarget).toBe(false);
  });

  test('eases toward the target and packs R=performer G=crowd', () => {
    const e = new SegEaser();
    e.setTarget(target(), 1000);
    expect(e.hasTarget).toBe(true);
    let f = e.frame(16, 1016)!;
    expect(f.w).toBe(2);
    expect(f.h).toBe(2);
    expect(f.motion).toBeGreaterThan(0);
    expect(f.motion).toBeLessThan(0.8);
    expect(f.mix).toBe(0.5);
    for (let i = 0; i < 200; i++) f = e.frame(16, 1016 + i)!;
    expect(f.rgba[0]).toBeGreaterThan(250); // performer cell -> R
    expect(f.rgba[1]).toBeLessThan(5);
    expect(f.rgba[12]).toBeLessThan(5);
    expect(f.rgba[13]).toBeGreaterThan(250); // crowd cell -> G
    expect(f.motion).toBeCloseTo(0.8, 2);
    expect(f.box[0]).toBeCloseTo(0.1, 2);
  });

  test('a missing box collapses in place', () => {
    const e = new SegEaser();
    e.setTarget(target(), 1000);
    for (let i = 0; i < 120; i++) e.frame(16, 1000 + i);
    e.setTarget(target({ box: null }), 3000);
    const f = e.frame(500, 3500)!;
    expect(f.box[2]).toBeLessThan(0.3);
    expect(f.box[3]).toBeLessThan(0.4);
    expect(f.box[0]).toBeGreaterThan(0.1);
  });

  test('stale masks fade the mix to zero', () => {
    const e = new SegEaser();
    e.setTarget(target(), 1000);
    expect(e.frame(16, 5000)!.mix).toBe(0.5);
    expect(e.frame(16, 11_500)!.mix).toBeCloseTo(0.375, 9);
    expect(e.frame(16, 13_000)!.mix).toBe(0);
  });

  test('reallocates when the grid size changes', () => {
    const e = new SegEaser();
    e.setTarget(target(), 1000);
    e.frame(16, 1016);
    e.setTarget(target({ perf: new Uint8Array(16).fill(1), crowd: new Uint8Array(16), w: 4, h: 4 }), 2000);
    const f = e.frame(16, 2016)!;
    expect(f.rgba.length).toBe(64);
    expect(f.w).toBe(4);
  });
});
