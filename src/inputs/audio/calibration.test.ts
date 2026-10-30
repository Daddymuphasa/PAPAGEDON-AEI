import { describe, expect, test } from 'vitest';
import { CAL_GAIN_MAX, CAL_GAIN_MIN, Calibrator } from './calibration';

function feed(c: Calibrator, values: number[]): void {
  c.start();
  for (const v of values) c.push(v);
}

describe('Calibrator', () => {
  test('unity until finished: apply is identity', () => {
    const c = new Calibrator();
    c.start();
    c.push(0.3);
    expect(c.ready).toBe(false);
    expect(c.apply(0.3)).toBe(0.3);
  });

  test('loud room: gain pulls p90 down toward 0.5', () => {
    const c = new Calibrator();
    // Room hovering 0.6-0.9 with quiet dips near 0.2.
    const samples = Array.from({ length: 180 }, (_, i) => (i % 9 === 0 ? 0.2 : 0.6 + ((i * 37) % 30) / 100));
    feed(c, samples);
    const s = c.finish();
    expect(c.ready).toBe(true);
    expect(s.gain).toBeLessThan(1);
    expect(s.gain).toBeGreaterThanOrEqual(CAL_GAIN_MIN);
    expect(s.floor).toBeGreaterThan(0);
    // The loud end now reads ~0.5.
    expect(c.apply(0.85)).toBeGreaterThan(0.35);
    expect(c.apply(0.85)).toBeLessThan(0.65);
  });

  test('quiet room: gain lifts the signal without boosting the floor', () => {
    const c = new Calibrator();
    const samples = Array.from({ length: 180 }, (_, i) => 0.06 + ((i * 53) % 14) / 100);
    feed(c, samples);
    const s = c.finish();
    expect(s.gain).toBeGreaterThan(1);
    expect(s.gain).toBeLessThanOrEqual(CAL_GAIN_MAX);
    expect(c.apply(s.floor)).toBe(0);
    expect(c.apply(0.2)).toBeGreaterThan(0.2);
  });

  test('silence keeps unity so noise is never boosted', () => {
    const c = new Calibrator();
    feed(c, Array.from({ length: 180 }, () => 0.005));
    const s = c.finish();
    expect(s).toEqual({ gain: 1, floor: 0 });
    expect(c.apply(0.4)).toBe(0.4);
  });

  test('empty window keeps unity', () => {
    const c = new Calibrator();
    c.start();
    expect(c.finish()).toEqual({ gain: 1, floor: 0 });
  });

  test('apply clamps to 0-1 and ignores NaN', () => {
    const c = new Calibrator();
    feed(c, Array.from({ length: 60 }, (_, i) => 0.1 + (i % 10) / 100));
    c.finish();
    expect(c.apply(5)).toBe(1);
    expect(c.apply(-2)).toBe(0);
    expect(c.apply(NaN)).toBe(0);
  });

  test('restart clears previous results', () => {
    const c = new Calibrator();
    feed(c, Array.from({ length: 60 }, (_, i) => (i % 9 === 0 ? 0.2 : 0.6 + (i % 10) / 50)));
    c.finish();
    expect(c.current.gain).toBeLessThan(1);
    c.start();
    expect(c.ready).toBe(false);
    expect(c.current).toEqual({ gain: 1, floor: 0 });
  });
});
