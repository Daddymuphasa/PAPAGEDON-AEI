import { describe, expect, test } from 'vitest';
import {
  adaptiveBeat,
  bandBins,
  BEAT_COOLDOWN_MS,
  bpmFromIntervals,
  ENV_ATTACK_MS,
  ENV_RELEASE_MS,
  Envelope,
  foldBpm,
  rawEnergy,
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

describe('adaptive beat (M6 either-or rule)', () => {
  const hist = (v: number, n = 60) => Array.from({ length: n }, () => v);
  const subHist = (v: number, n = 30) => Array.from({ length: n }, () => v);

  test('kick arm fires on bass + flux above their rolling averages', () => {
    const d = adaptiveBeat(0.4, 0.02, 0.05, hist(0.2), hist(0.008), subHist(0.05), 5000, 0);
    expect(d.beat).toBe(true);
    expect(d.confidence).toBeGreaterThan(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
  });

  test('sub arm fires on sub alone for 808s', () => {
    const d = adaptiveBeat(0.2, 0.008, 0.3, hist(0.2), hist(0.008), subHist(0.1), 5000, 0);
    expect(d.beat).toBe(true);
    expect(d.confidence).toBeGreaterThan(0);
  });

  test('detects quiet and loud mixes alike', () => {
    const quiet = adaptiveBeat(0.12, 0.006, 0.05, hist(0.08), hist(0.0035), subHist(0.05), 5000, 0);
    expect(quiet.beat).toBe(true);
    const loud = adaptiveBeat(0.8, 0.05, 0.05, hist(0.5), hist(0.02), subHist(0.05), 5000, 0);
    expect(loud.beat).toBe(true);
  });

  test('kick arm needs both bass and flux', () => {
    // Bass spike alone (sub parked below its floor).
    expect(adaptiveBeat(0.4, 0.008, 0.05, hist(0.2), hist(0.008), subHist(0.05), 5000, 0).beat).toBe(false);
    // Flux spike alone.
    expect(adaptiveBeat(0.2, 0.03, 0.05, hist(0.2), hist(0.008), subHist(0.05), 5000, 0).beat).toBe(false);
  });

  test('honours the absolute floors', () => {
    // Huge ratios but whisper-quiet absolute levels: silence never fires.
    expect(adaptiveBeat(0.04, 0.02, 0.05, hist(0.01), hist(0.002), subHist(0.05), 5000, 0).beat).toBe(false);
    expect(adaptiveBeat(0.4, 0.001, 0.05, hist(0.1), hist(0.0002), subHist(0.05), 5000, 0).beat).toBe(false);
    expect(adaptiveBeat(0.2, 0.008, 0.08, hist(0.2), hist(0.008), subHist(0.01), 5000, 0).beat).toBe(false);
  });

  test('never double-fires inside the cooldown', () => {
    const first = adaptiveBeat(0.4, 0.02, 0.05, hist(0.2), hist(0.008), subHist(0.05), 5000, 0);
    expect(first.beat).toBe(true);
    const again = adaptiveBeat(
      0.5, 0.03, 0.05, hist(0.2), hist(0.008), subHist(0.05), 5000 + BEAT_COOLDOWN_MS - 1, 5000,
    );
    expect(again.beat).toBe(false);
    const later = adaptiveBeat(
      0.5, 0.03, 0.05, hist(0.2), hist(0.008), subHist(0.05), 5000 + BEAT_COOLDOWN_MS, 5000,
    );
    expect(later.beat).toBe(true);
  });
});

describe('beat scenarios (60fps simulation)', () => {
  interface Frame {
    bass: number;
    flux: number;
    sub: number;
  }

  // Drive the rule frame by frame like the analyzer does, histories
  // pre-warmed on the baseline (a settled detector). Returns beat ms.
  function simulate(frames: Frame[], warm: Frame, dtMs = 1000 / 60): number[] {
    const bassHist = Array(60).fill(warm.bass) as number[];
    const fluxHist = Array(60).fill(warm.flux) as number[];
    const subHist = Array(30).fill(warm.sub) as number[];
    let lastBeat = -1e9;
    const beats: number[] = [];
    frames.forEach((fr, i) => {
      const now = i * dtMs;
      const d = adaptiveBeat(fr.bass, fr.flux, fr.sub, bassHist, fluxHist, subHist, now, lastBeat);
      if (d.beat) {
        beats.push(now);
        lastBeat = now;
      }
      bassHist.push(fr.bass);
      if (bassHist.length > 60) bassHist.shift();
      fluxHist.push(fr.flux);
      if (fluxHist.length > 60) fluxHist.shift();
      subHist.push(fr.sub);
      if (subHist.length > 30) subHist.shift();
    });
    return beats;
  }

  test('kick on four-on-the-floor at 126 BPM: every kick fires, no doubles', () => {
    const base = { bass: 0.25, flux: 0.006, sub: 0.15 };
    const kick = { bass: 0.7, flux: 0.05, sub: 0.5 };
    const period = 60000 / 126;
    const frames: Frame[] = [];
    for (let i = 0; i < 150; i++) {
      const t = (i * 1000) / 60;
      const phase = ((t + period / 2) / period) % 1; // first kick mid-window
      frames.push(phase * period < 1000 / 30 ? { ...kick } : { ...base });
    }
    const beats = simulate(frames, base);
    expect(beats).toHaveLength(5);
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i] - beats[i - 1]).toBeGreaterThan(400);
    }
  });

  test('sub-only 808: fires with flat bass and flux', () => {
    const base = { bass: 0.2, flux: 0.005, sub: 0.12 };
    const drop = { bass: 0.2, flux: 0.005, sub: 0.6 };
    const frames: Frame[] = [];
    for (let i = 0; i < 120; i++) {
      const t = (i * 1000) / 60;
      const phase = ((t + 400) / 800) % 1; // drops at 400ms and 1200ms
      frames.push(phase * 800 < 50 ? { ...drop } : { ...base });
    }
    expect(simulate(frames, base)).toHaveLength(2);
  });

  test('silence never triggers', () => {
    const quiet = { bass: 0, flux: 0, sub: 0 };
    const frames: Frame[] = Array.from({ length: 120 }, () => ({ ...quiet }));
    expect(simulate(frames, quiet)).toHaveLength(0);
  });

  test('hi-hat-only ticks never trigger', () => {
    // Small flux bumps on a flat low end: the kick arm needs bass too.
    const base = { bass: 0.2, flux: 0.006, sub: 0.05 };
    const frames: Frame[] = [];
    for (let i = 0; i < 120; i++) {
      const tick = i % 15 < 2;
      frames.push({ bass: 0.2, flux: tick ? 0.009 : 0.006, sub: 0.05 });
    }
    expect(simulate(frames, base)).toHaveLength(0);
  });
});

describe('rawEnergy', () => {
  test('weights the four bands and clamps to 1', () => {
    expect(rawEnergy({ subBass: 1, bass: 1, mid: 1, high: 1 })).toBe(1);
    expect(rawEnergy({ subBass: 0.5, bass: 0.5, mid: 0.5, high: 0.5 })).toBe(0.5);
    expect(rawEnergy({ subBass: 2, bass: 2, mid: 2, high: 2 })).toBe(1);
    expect(rawEnergy({ subBass: 0, bass: 0, mid: 0, high: 0 })).toBe(0);
  });
});

describe('Envelope', () => {
  test('snaps to the target on the first step', () => {
    const env = new Envelope();
    expect(env.step(0.7, 16.7)).toBe(0.7);
  });

  test('attack reaches ~63% within one attack tau', () => {
    const env = new Envelope(15, 220);
    env.step(0, 0);
    expect(env.step(1, 15)).toBeCloseTo(1 - Math.exp(-1), 3);
  });

  test('attack is much faster than release', () => {
    const up = new Envelope(15, 220);
    up.step(0, 0);
    const attackMove = up.step(1, 15);
    const down = new Envelope(15, 220);
    down.step(1, 0);
    const releaseMove = 1 - down.step(0, 15);
    expect(attackMove).toBeGreaterThan(releaseMove * 5);
  });

  test('defaults sit in the 10-20ms attack / 150-300ms release band', () => {
    expect(ENV_ATTACK_MS).toBeGreaterThanOrEqual(10);
    expect(ENV_ATTACK_MS).toBeLessThanOrEqual(20);
    expect(ENV_RELEASE_MS).toBeGreaterThanOrEqual(150);
    expect(ENV_RELEASE_MS).toBeLessThanOrEqual(300);
  });

  test('reset re-arms the snap', () => {
    const env = new Envelope();
    env.step(0.2, 16.7);
    env.step(0.9, 16.7);
    env.reset();
    expect(env.step(0.4, 16.7)).toBe(0.4);
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
