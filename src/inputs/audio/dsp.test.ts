import { describe, expect, test } from 'vitest';
import {
  adaptiveBeat,
  bandBins,
  BEAT_COOLDOWN_MS,
  bpmFromIntervals,
  foldBpm,
} from './dsp';

describe('band edges', () => {
  test('48 kHz / 2048: kick bins land in bass, not mids', () => {
    // bin width 23.4375 Hz
    expect(bandBins(20, 60, 48000, 2048)).toEqual([1, 2]);
    expect(bandBins(60, 250, 48000, 2048)).toEqual([3, 10]);
    const [, midHi] = bandBins(250, 4000, 48000, 2048);
    expect(midHi).toBe(170);
  });

  test('44.1 kHz / 2048 stays in range', () => {
    const [lo, hi] = bandBins(4000, 12000, 44100, 2048);
    expect(lo).toBeGreaterThanOrEqual(1);
    expect(hi).toBeLessThanOrEqual(1023);
    expect(hi).toBeGreaterThan(lo);
    expect(bandBins(20, 60, 44100, 2048)).toEqual([1, 2]);
  });
});

describe('adaptive beat', () => {
  const hist = (v: number, n = 90) => Array.from({ length: n }, () => v);

  test('fires on a spike above mean x k on both signals', () => {
    const d = adaptiveBeat(0.4, 0.02, hist(0.2), hist(0.008), 5000, 0);
    expect(d.beat).toBe(true);
    expect(d.confidence).toBeGreaterThan(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
  });

  test('detects quiet and loud mixes alike', () => {
    const quiet = adaptiveBeat(0.12, 0.006, hist(0.08), hist(0.0035), 5000, 0);
    expect(quiet.beat).toBe(true);
    const loud = adaptiveBeat(0.8, 0.05, hist(0.5), hist(0.02), 5000, 0);
    expect(loud.beat).toBe(true);
  });

  test('needs both energy and flux', () => {
    expect(adaptiveBeat(0.4, 0.008, hist(0.2), hist(0.008), 5000, 0).beat).toBe(false);
    expect(adaptiveBeat(0.2, 0.03, hist(0.2), hist(0.008), 5000, 0).beat).toBe(false);
  });

  test('honours the absolute floors', () => {
    expect(adaptiveBeat(0.05, 0.02, hist(0.01), hist(0.002), 5000, 0).beat).toBe(false);
    expect(adaptiveBeat(0.4, 0.001, hist(0.1), hist(0.0002), 5000, 0).beat).toBe(false);
  });

  test('never double-fires inside the cooldown', () => {
    const first = adaptiveBeat(0.4, 0.02, hist(0.2), hist(0.008), 5000, 0);
    expect(first.beat).toBe(true);
    const again = adaptiveBeat(0.5, 0.03, hist(0.2), hist(0.008), 5000 + BEAT_COOLDOWN_MS - 1, 5000);
    expect(again.beat).toBe(false);
    const later = adaptiveBeat(0.5, 0.03, hist(0.2), hist(0.008), 5000 + BEAT_COOLDOWN_MS, 5000);
    expect(later.beat).toBe(true);
  });
});

describe('bpm', () => {
  test('steady 120 BPM kick reads 118-122', () => {
    const iv = [0.5, 0.51, 0.49, 0.5, 0.505, 0.495];
    const bpm = bpmFromIntervals(iv);
    expect(bpm).toBeGreaterThanOrEqual(118);
    expect(bpm).toBeLessThanOrEqual(122);
  });

  test('returns 0 until confident', () => {
    expect(bpmFromIntervals([0.5, 0.5])).toBe(0);
    expect(bpmFromIntervals([0.5, 0.9, 0.4, 0.7])).toBe(0);
  });

  test('folds octaves into 80-170', () => {
    expect(foldBpm(70)).toBe(140);
    expect(foldBpm(180)).toBe(90);
    expect(foldBpm(60)).toBe(120);
    expect(foldBpm(200)).toBe(100);
    expect(foldBpm(126)).toBe(126);
  });
});
