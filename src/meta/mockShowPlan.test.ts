// Batch-5 mock planner: valid registered IDs, 1500ms crossfades, no
// immediate repeat, theme/energy metadata preference. Pure: no keys.
import { describe, expect, test } from 'vitest';
import type { PlannerInput, ShowPlan, VisualizerInfo } from '../types';
import { mockShowPlan } from './mock';
import { planShow } from './index';

const P3 = [
  { key: 'p1', label: 'One', min: 0, max: 1, def: 0.5 },
  { key: 'p2', label: 'Two', min: 0, max: 1, def: 0.5 },
  { key: 'p3', label: 'Three', min: 0, max: 1, def: 0.5 },
];

const VIZ: VisualizerInfo[] = [
  {
    id: 'a-neon',
    name: 'A Neon',
    tags: ['shader-library'],
    params: P3,
    meta: { themeTags: ['neon', 'laser'], energyRange: [0.4, 1.0], moods: ['electric'] },
  },
  {
    id: 'b-calm',
    name: 'B Calm',
    tags: ['shader-library'],
    params: P3,
    meta: { themeTags: ['doves'], energyRange: [0.0, 0.3], moods: ['gentle'] },
  },
  {
    id: 'c-mid',
    name: 'C Mid',
    tags: ['shader-library'],
    params: P3,
    meta: { themeTags: ['waves'], energyRange: [0.3, 0.7], moods: ['flowing'] },
  },
];

function plan(id: string): ShowPlan {
  return {
    visualId: id,
    params: [0.5, 0.5, 0.5],
    intensity: 0.7,
    speed: 1,
    paletteEmphasis: 0,
    transition: { type: 'crossfade', durationMs: 1500 },
    energyArc: 'sustain',
    sectionSeconds: 30,
    reason: 'prior',
  };
}

function input(over: Partial<PlannerInput> = {}): PlannerInput {
  return {
    theme: {
      eventName: 'Test Night',
      genre: 'Techno',
      mood: 'electric',
      palette: ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'],
      energy: 0.8,
      motifs: ['neon', 'laser'],
      typographyFeel: 'bold',
      tempoBpm: { min: 120, max: 130 },
      sceneSwitchSeconds: { min: 4, max: 12 },
      suggestedShaderIds: [],
    },
    summary: {
      avgEnergy: 0.8,
      peakEnergy: 0.9,
      avgBass: 0.7,
      avgMid: 0.5,
      avgHigh: 0.4,
      events: [],
      bpm: 126,
      seconds: 20,
    },
    current: { visualId: 'c-mid', params: [0.5, 0.5, 0.5], intensity: 0.7, speed: 1, paletteEmphasis: 0 },
    lastPlans: [plan('b-calm')],
    visualizers: VIZ,
    ...over,
  };
}

describe('mockShowPlan (Batch-5 rules)', () => {
  test('picks only registered visualizer IDs', () => {
    for (let cursor = 0; cursor < 12; cursor++) {
      const p = mockShowPlan(input(), cursor);
      expect(VIZ.map((v) => v.id)).toContain(p.visualId);
    }
  });

  test('always emits a 1500ms crossfade, on every arc', () => {
    const arcs: PlannerInput['summary']['events'][] = [[], ['drop'], ['build'], ['breakdown']];
    for (const events of arcs) {
      for (let cursor = 0; cursor < 6; cursor++) {
        const p = mockShowPlan(input({ summary: { ...input().summary, events } }), cursor);
        expect(p.transition).toEqual({ type: 'crossfade', durationMs: 1500 });
      }
    }
  });

  test('never repeats the current scene or the last plan', () => {
    for (let cursor = 0; cursor < 20; cursor++) {
      const p = mockShowPlan(input(), cursor);
      expect(p.visualId).not.toBe('c-mid');
      expect(p.visualId).not.toBe('b-calm');
    }
  });

  test('prefers a theme-tag match', () => {
    // a-neon matches genre/mood/motifs (electric, neon, laser); b-calm does not.
    const in2 = input({ lastPlans: [plan('zzz')] });
    expect(mockShowPlan(in2, 0).visualId).toBe('a-neon');
    expect(mockShowPlan(in2, 5).visualId).toBe('a-neon');
  });

  test('prefers a suggested shader id over a lone tag match', () => {
    const theme2 = {
      ...input().theme!,
      genre: 'X',
      mood: 'Y',
      motifs: ['neon'],
      suggestedShaderIds: ['b-calm'],
    };
    const in2 = input({
      theme: theme2,
      current: { visualId: 'zzz', params: [0.5, 0.5, 0.5], intensity: 0.7, speed: 1, paletteEmphasis: 0 },
      lastPlans: [],
      summary: { ...input().summary, avgEnergy: 0.2 },
    });
    // a-neon: one tag (+2). b-calm: suggested (+3) + energy fit (+1). b wins.
    expect(mockShowPlan(in2, 0).visualId).toBe('b-calm');
  });

  test('prefers an energy-range fit when tags tie', () => {
    const in2 = input({
      theme: null,
      current: { visualId: 'zzz', params: [0.5, 0.5, 0.5], intensity: 0.7, speed: 1, paletteEmphasis: 0 },
      lastPlans: [],
      summary: { ...input().summary, avgEnergy: 0.1 },
    });
    // Only b-calm's range contains 0.1.
    expect(mockShowPlan(in2, 0).visualId).toBe('b-calm');
  });

  test('rotates deterministically between equal scores', () => {
    const in2 = input({
      theme: null,
      current: { visualId: 'zzz', params: [0.5, 0.5, 0.5], intensity: 0.7, speed: 1, paletteEmphasis: 0 },
      lastPlans: [],
      summary: { ...input().summary, avgEnergy: 0.5 },
      visualizers: VIZ.map((v) => ({ ...v, meta: undefined })),
    });
    expect(mockShowPlan(in2, 0).visualId).toBe('a-neon');
    expect(mockShowPlan(in2, 1).visualId).toBe('b-calm');
    expect(mockShowPlan(in2, 0)).toEqual(mockShowPlan(in2, 0));
  });

  test('falls back to the only visualizer when everything is banned', () => {
    const in2 = input({ visualizers: [VIZ[0]] });
    expect(mockShowPlan(in2, 0).visualId).toBe('a-neon');
  });

  test('keeps params inside declared ranges', () => {
    for (let cursor = 0; cursor < 10; cursor++) {
      const p = mockShowPlan(input(), cursor);
      expect(p.params).toHaveLength(3);
      for (const v of p.params) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  test('planShow resolves a mock plan with no key set', async () => {
    const p = await planShow(input());
    expect(VIZ.map((v) => v.id)).toContain(p.visualId);
    expect(p.transition).toEqual({ type: 'crossfade', durationMs: 1500 });
  });
});
