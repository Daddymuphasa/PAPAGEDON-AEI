import { describe, expect, test, vi } from 'vitest';
import { emptySignals, type ExperienceSignals } from '../lib/papagedon/analyzer';
import type { ExperienceGraphOutput } from '../lib/papagedon/experienceGraph';
import {
  applyLiveToEngine,
  engineSignalsToFeatures,
  punchBeatBoost,
  resolveStageTransition,
  rolesToThemeDef,
  type EngineLiveTarget,
} from './engineBridge';

const GRAPH: ExperienceGraphOutput = { event: 'Beat', state: 'Calm', mood: 0.4 };

function signals(over: Partial<ExperienceSignals> = {}): ExperienceSignals {
  return { ...emptySignals(), ...over };
}

describe('engineSignalsToFeatures', () => {
  test('maps bands, beat edges and graph events', () => {
    const f = engineSignalsToFeatures(
      signals({ energy: 0.5, bass: 0.6, mid: 0.4, treble: 0.3, beat: true, bpm: 126, confidence: 0.9 }),
      GRAPH,
      { energy: 0.4, beat: false },
      1000,
    );
    expect(f.bpm).toBe(126);
    expect(f.beat).toBe(true);
    expect(f.onset).toBe(true);
    expect(f.bass).toBe(0.6);
    expect(f.mid).toBe(0.4);
    expect(f.high).toBe(0.3);
    expect(f.subBass).toBeCloseTo(0.48, 9);
    expect(f.flux).toBeCloseTo(0.1, 9);
    expect(f.beatConfidence).toBe(0.9);
    expect(f.energy).toBe(0.5);
    expect(f.buildUp).toBe(false);
    expect(f.drop).toBe(false);
    expect(f.timestamp).toBe(1000);
  });

  test('onset fires only on beat edges, flux starts at zero', () => {
    const held = engineSignalsToFeatures(signals({ beat: true }), GRAPH, { energy: 0.5, beat: true }, 0);
    expect(held.onset).toBe(false);
    const first = engineSignalsToFeatures(signals({ beat: false, energy: 0.5 }), GRAPH, null, 0);
    expect(first.onset).toBe(false);
    expect(first.flux).toBe(0);
  });

  test('graph BuildUp/Drop become director flags', () => {
    const b = engineSignalsToFeatures(signals(), { ...GRAPH, event: 'BuildUp' }, null, 0);
    expect(b.buildUp).toBe(true);
    expect(b.drop).toBe(false);
    const d = engineSignalsToFeatures(signals(), { ...GRAPH, event: 'Drop' }, null, 0);
    expect(d.buildUp).toBe(false);
    expect(d.drop).toBe(true);
  });
});

describe('applyLiveToEngine', () => {
  function target(): EngineLiveTarget {
    return {
      preset: { saturationBase: 0.15, saturationScale: 0.85, energyMultiplier: 1 },
      master: { exposure: 1 },
      speed: 1,
    };
  }

  test('writes params and speed', () => {
    const t = target();
    applyLiveToEngine({ intensity: 0.7, speed: 1.4, extra: [0.2, 1.1, 1.6] }, t);
    expect(t.preset.saturationBase).toBe(0.2);
    expect(t.preset.saturationScale).toBe(1.1);
    expect(t.master.exposure).toBe(1.6);
    expect(t.preset.energyMultiplier).toBe(1);
    expect(t.speed).toBe(1.3);
  });

  test('clamps to declared ranges', () => {
    const t = target();
    applyLiveToEngine({ intensity: 0, speed: 9, extra: [9, -9, 9] }, t);
    expect(t.preset.saturationBase).toBe(0.5);
    expect(t.preset.saturationScale).toBe(0);
    expect(t.master.exposure).toBe(2);
    expect(t.preset.energyMultiplier).toBe(0.85);
    expect(t.speed).toBe(1.3);
  });
});

describe('applyLiveToEngine reactivity band', () => {
  function target(): EngineLiveTarget {
    return {
      preset: { saturationBase: 0.15, saturationScale: 0.85, energyMultiplier: 1 },
      master: { exposure: 1 },
      speed: 1,
    };
  }

  test('neutral director state maps to unity multipliers', () => {
    const t = target();
    applyLiveToEngine({ intensity: 0.7, speed: 1, extra: [0.15, 0.85, 1] }, t);
    expect(t.preset.energyMultiplier).toBe(1);
    expect(t.speed).toBe(1);
  });

  test('intensity and speed never leave 0.85-1.3', () => {
    const t = target();
    applyLiveToEngine({ intensity: 0, speed: 0.6, extra: [0.15, 0.85, 1] }, t);
    expect(t.preset.energyMultiplier).toBe(0.85);
    expect(t.speed).toBe(0.85);
    applyLiveToEngine({ intensity: 1, speed: 2, extra: [0.15, 0.85, 1] }, t);
    expect(t.preset.energyMultiplier).toBe(1.3);
    expect(t.speed).toBe(1.3);
  });
});

describe('resolveStageTransition', () => {
  test('flash-cut becomes a normal 250ms crossfade', () => {
    expect(resolveStageTransition({ type: 'flash-cut', durationMs: 900 })).toEqual({ kind: 'xfade', ms: 250 });
  });

  test('cut and crossfade pass through, tiny fades clamp to 60ms', () => {
    expect(resolveStageTransition({ type: 'cut', durationMs: 900 })).toEqual({ kind: 'cut' });
    expect(resolveStageTransition({ type: 'crossfade', durationMs: 1500 })).toEqual({ kind: 'xfade', ms: 1500 });
    expect(resolveStageTransition({ type: 'crossfade', durationMs: 10 })).toEqual({ kind: 'xfade', ms: 60 });
  });
});

describe('punchBeatBoost', () => {
  function punchy(beat = 1, energy = 1) {
    return { preset: { beatResponse: beat, energyMultiplier: energy } };
  }

  test('boosts the shader for 300ms then restores', () => {
    vi.useFakeTimers();
    try {
      const a = punchy();
      punchBeatBoost([a]);
      expect(a.preset.beatResponse).toBe(2.2);
      expect(a.preset.energyMultiplier).toBe(1.3);
      vi.advanceTimersByTime(299);
      expect(a.preset.beatResponse).toBe(2.2);
      vi.advanceTimersByTime(1);
      expect(a.preset.beatResponse).toBe(1);
      expect(a.preset.energyMultiplier).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  test('cancel restores the previous director values at once', () => {
    vi.useFakeTimers();
    try {
      const a = punchy(1, 1.1);
      const cancel = punchBeatBoost([a]);
      expect(a.preset.energyMultiplier).toBe(1.3);
      cancel();
      expect(a.preset.beatResponse).toBe(1);
      expect(a.preset.energyMultiplier).toBe(1.1);
      vi.advanceTimersByTime(10000);
      expect(a.preset.energyMultiplier).toBe(1.1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('rolesToThemeDef', () => {
  test('maps colour roles to an engine theme', () => {
    const t = rolesToThemeDef('Test Night', {
      background: '#000000',
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff',
      highlight: '#ffffff',
    });
    expect(t.id).toBe('flyer');
    expect(t.name).toBe('Test Night');
    expect(t.palette).toEqual({
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff',
      background: '#000000',
    });
  });
});
