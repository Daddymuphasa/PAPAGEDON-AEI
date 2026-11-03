// Auto-sensitivity tests: constant noise sinks to ~0, real peaks pass,
// noise beats are blocked, modes order calm < balanced < wild.
import { describe, expect, test } from 'vitest';
import { emptySignals, type ExperienceSignals } from '../../lib/papagedon/analyzer';
import { AutoSensitivity, type SensitivityMode } from './autoSensitivity';

function sig(partial: Partial<ExperienceSignals>): ExperienceSignals {
  return { ...emptySignals(), ...partial };
}

function run(s: AutoSensitivity, frames: ExperienceSignals[], mode: SensitivityMode = 'auto'): ExperienceSignals {
  let out = sig({});
  for (const f of frames) out = s.update(f, mode);
  return out;
}

const NOISE = sig({ energy: 0.7, bass: 0.7, mid: 0.65, treble: 0.6, beat: false });
const PEAK = sig({ energy: 0.95, bass: 0.98, mid: 0.7, treble: 0.6, beat: true });

describe('auto sensitivity', () => {
  test('steady noise floor sinks toward zero', () => {
    const s = new AutoSensitivity();
    const out = run(s, Array.from({ length: 400 }, () => NOISE));
    expect(out.energy).toBeLessThan(0.15);
    expect(out.bass).toBeLessThan(0.15);
    expect(out.beat).toBe(false);
  });

  test('peaks above the learned floor pass through', () => {
    const s = new AutoSensitivity();
    run(s, Array.from({ length: 300 }, () => NOISE));
    const out = s.update(PEAK, 'auto');
    expect(out.energy).toBeGreaterThan(0.5);
    expect(out.bass).toBeGreaterThan(0.5);
    expect(out.beat).toBe(true);
  });

  test('noise beats are blocked, real beats pass', () => {
    const s = new AutoSensitivity();
    run(s, Array.from({ length: 300 }, () => NOISE));
    // Beat flag on noise-level bass: blocked.
    expect(s.update(sig({ ...NOISE, beat: true }), 'auto').beat).toBe(false);
    // Beat flag on a real jump: passes.
    expect(s.update(PEAK, 'auto').beat).toBe(true);
  });

  test('modes order calm < balanced < wild on the same signal', () => {
    const mk = () => {
      const s = new AutoSensitivity();
      run(s, Array.from({ length: 300 }, () => NOISE));
      return s;
    };
    const mid = sig({ energy: 0.85, bass: 0.9, mid: 0.7, treble: 0.6, beat: false });
    const calm = mk().update(mid, 'calm').energy;
    const balanced = mk().update(mid, 'balanced').energy;
    const wild = mk().update(mid, 'wild').energy;
    expect(calm).toBeLessThan(balanced);
    expect(balanced).toBeLessThan(wild);
  });

  test('status learns then locks, reset restarts', () => {
    const s = new AutoSensitivity();
    expect(s.status()).toBe('learning');
    run(s, Array.from({ length: 200 }, () => NOISE));
    expect(s.status()).toBe('locked');
    s.reset();
    expect(s.status()).toBe('learning');
  });

  test('spectrum scales with the gate and garbage survives', () => {
    const s = new AutoSensitivity();
    run(s, Array.from({ length: 300 }, () => NOISE));
    const withSpec = sig({ ...NOISE });
    withSpec.spectrum = new Float32Array([0.9, 0.8, 0.7]);
    const out = s.update(withSpec, 'auto');
    expect(out.spectrum[0]).toBeLessThan(0.9);
    const bad = s.update(sig({ energy: Number.NaN, bass: Infinity, beat: false }), 'auto');
    expect(Number.isFinite(bad.energy)).toBe(true);
    expect(Number.isFinite(bad.bass)).toBe(true);
  });
});
