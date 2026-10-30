import { describe, expect, test } from 'vitest';
import {
  EnergyBuffer,
  energyShifted,
  isBreakdown,
  isBuild,
  isDrop,
} from './energy';

// Push a synthetic series: value fn of t, 10 samples/sec.
function series(fn: (t: number) => number, seconds: number): { buf: EnergyBuffer; now: number } {
  const buf = new EnergyBuffer();
  const n = Math.floor(seconds * 10);
  for (let i = 0; i <= n; i++) {
    const t = i / 10;
    buf.push(t, Math.min(1, Math.max(0, fn(t))));
  }
  return { buf, now: n / 10 };
}

describe('energy detection', () => {
  test('finds a build on rising energy', () => {
    const { buf, now } = series((t) => (t < 14 ? 0.3 : 0.3 + (t - 14) * 0.08), 20);
    expect(isBuild(buf, now)).toBe(true);
    expect(isBreakdown(buf, now)).toBe(false);
  });

  test('ignores flat energy for builds', () => {
    const { buf, now } = series(() => 0.5, 20);
    expect(isBuild(buf, now)).toBe(false);
  });

  test('finds a drop on a sharp jump after a build', () => {
    const { buf, now } = series((t) => (t < 18 ? 0.3 + (t / 18) * 0.3 : 0.9), 20);
    expect(isDrop(buf, now, true)).toBe(true);
  });

  test('needs the jump even after a build', () => {
    const { buf, now } = series((t) => 0.3 + (t / 20) * 0.3, 20);
    expect(isDrop(buf, now, true)).toBe(false);
  });

  test('finds a breakdown on sustained low energy', () => {
    const { buf, now } = series((t) => (t < 5 ? 0.7 : 0.15), 20);
    expect(isBreakdown(buf, now)).toBe(true);
    expect(isBuild(buf, now)).toBe(false);
  });

  test('no breakdown when the dip is brief', () => {
    const { buf, now } = series((t) => (t > 18 ? 0.1 : 0.7), 20);
    expect(isBreakdown(buf, now)).toBe(false);
  });

  test('flags a sustained energy shift', () => {
    const { buf, now } = series((t) => (t < 12 ? 0.3 : 0.8), 20);
    expect(energyShifted(buf, now)).toBe(true);
  });

  test('ignores steady energy for shifts', () => {
    const { buf, now } = series(() => 0.5, 20);
    expect(energyShifted(buf, now)).toBe(false);
  });
});
