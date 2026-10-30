import { describe, expect, test } from 'vitest';
import type { ProfileSample } from '../../types';
import { computeProfile } from './profile';

function windowOf(n: number, make: (i: number) => ProfileSample): ProfileSample[] {
  return Array.from({ length: n }, (_, i) => make(i));
}

const bpms = (bpm: number, n = 240) => Array.from({ length: n }, () => bpm);

describe('computeProfile', () => {
  test('steady 126 BPM four-on-the-floor reads house/techno', () => {
    const samples = windowOf(240, (i) => ({
      subBass: 0.5, bass: 0.7, mid: 0.3, high: 0.2,
      energy: 0.55 + (i % 30 < 3 ? 0.25 : 0),
    }));
    const p = computeProfile(samples, bpms(126));
    expect(p.label).toBe('house/techno');
    expect(p.confidence).toBeGreaterThan(0.5);
    expect(p.bpm).toBe(126);
    expect(p.bpmRange).toEqual([126, 126]);
    expect(p.bassHeaviness).toBeGreaterThan(0.5);
  });

  test('syncopated 100 BPM with shimmer reads afrobeats/amapiano-ish', () => {
    const samples = windowOf(240, (i) => ({
      subBass: 0.45, bass: 0.55, mid: 0.35, high: 0.4,
      energy: 0.5 + 0.25 * Math.sin((i / 240) * Math.PI * 12),
    }));
    const p = computeProfile(samples, bpms(100));
    expect(p.label).toBe('afrobeats/amapiano-ish');
    expect(p.confidence).toBeGreaterThan(0.5);
  });

  test('sub-heavy 85 BPM reads hip-hop', () => {
    const samples = windowOf(240, (i) => ({
      subBass: 0.8, bass: 0.4, mid: 0.25, high: 0.15,
      energy: 0.5 + (i % 40 < 6 ? 0.3 : -0.1),
    }));
    const p = computeProfile(samples, bpms(85));
    expect(p.label).toBe('hip-hop');
    expect(p.confidence).toBeGreaterThan(0.5);
  });

  test('flat quiet wash with no tempo reads ambient', () => {
    const samples = windowOf(240, () => ({
      subBass: 0.1, bass: 0.15, mid: 0.3, high: 0.2, energy: 0.2,
    }));
    const p = computeProfile(samples, bpms(0));
    expect(p.label).toBe('ambient');
    expect(p.dynamics).toBe(0);
  });

  test('contradictory input falls back to mixed with low confidence', () => {
    // Off-grid tempo, no low end, violently swinging dynamics: too spiky
    // for ambient, too bass-free for the dancefloor labels.
    const samples = windowOf(240, (i) => ({
      subBass: 0.02, bass: 0.05, mid: 0.5, high: 0.5, energy: i % 2 === 0 ? 0.1 : 0.9,
    }));
    const p = computeProfile(samples, bpms(150));
    expect(p.label).toBe('mixed');
    expect(p.confidence).toBeLessThan(0.5);
  });

  test('tiny windows stay mixed with zero confidence', () => {
    const p = computeProfile([{ subBass: 0.5, bass: 0.7, mid: 0.3, high: 0.2, energy: 0.6 }], [126]);
    expect(p.label).toBe('mixed');
    expect(p.confidence).toBe(0);
  });

  test('features stay in range', () => {
    const samples = windowOf(100, (i) => ({
      subBass: 0.3, bass: 0.4, mid: 0.4, high: 0.3,
      energy: 0.4 + 0.2 * Math.sin(i),
    }));
    const p = computeProfile(samples, bpms(120, 100));
    for (const v of [p.bassHeaviness, p.brightness, p.dynamics, p.confidence]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
