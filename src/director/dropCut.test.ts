// Climax cuts: drops, 808 slams, and mapped drops always land a scene
// change with a fast 250ms fade — never a stale scene on the hit.
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { AudioFeatures, ShowPlan } from '../types';
import { clearDecisions, getDecisions } from './decisionLog';
import { ShowDirector, type DirectorView, type DirectorVisual } from './showDirector';
import { mockTrackMap } from './trackMap';

const P3 = [
  { key: 'p1', label: 'One', min: 0, max: 1, def: 0.5 },
  { key: 'p2', label: 'Two', min: 0, max: 1, def: 0.5 },
  { key: 'p3', label: 'Three', min: 0, max: 1, def: 0.5 },
];
const DEFS: DirectorVisual[] = [
  { id: 'calm-pool', name: 'Calm Pool', params: P3, meta: { themeTags: ['calm'], energyRange: [0, 0.4], moods: ['soft'] } },
  { id: 'peak-blast', name: 'Peak Blast', params: P3, meta: { themeTags: ['drop'], energyRange: [0.7, 1], moods: ['wild'] } },
  { id: 'mid-groove', name: 'Mid Groove', params: P3, meta: { themeTags: ['groove'], energyRange: [0.4, 0.8], moods: ['funky'] } },
];

function feat(energy: number, bass = energy): AudioFeatures {
  return {
    bpm: 126, beat: false, onset: false, bass, mid: 0.5, high: 0.5, subBass: 0.5,
    flux: 0, beatConfidence: 0, energy, buildUp: false, drop: false, timestamp: 0,
  };
}

function setup() {
  const posts: { t: string; [k: string]: unknown }[] = [];
  const views: DirectorView[] = [];
  const d = new ShowDirector({ onScene: (m) => posts.push(m), defs: DEFS, getTheme: () => null, onUpdate: (v) => views.push(v) });
  return { d, posts, views };
}

// Drive frames at 0.1s steps; energy/bass from fn of track seconds.
function drive(d: ShowDirector, t0: number, from: number, to: number, fn: (t: number) => [number, number]): void {
  for (let t = from; t <= to + 1e-9; t += 0.1) {
    const [e, b] = fn(t);
    d.frame(feat(e, b), t0 + t * 1000);
  }
}

// 0.3 -> 0.7 rise over track seconds 8-14 (a real build, no drop).
function ramp(t: number): [number, number] {
  const v = 0.3 + ((t - 8) / 6) * 0.4;
  return [v, v];
}

const flush = async (n = 30): Promise<void> => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
};

afterEach(() => {
  vi.unstubAllGlobals();
  clearDecisions();
});

describe('climax cuts', () => {
  test('drop with no waiting plan still cuts to a peak scene on a fast fade', () => {
    const { d, posts } = setup();
    const t0 = 500000;
    drive(d, t0, 0, 8, () => [0.3, 0.3]);
    drive(d, t0, 8.1, 14, ramp);
    drive(d, t0, 14.1, 15, () => [0.95, 0.95]);
    expect(posts.some((p) => p.t === 'hit')).toBe(true);
    const scenes = posts.filter((p) => p.t === 'scene');
    expect(scenes.length).toBeGreaterThan(0);
    const last = scenes[scenes.length - 1];
    expect(last.visualId).toBe('peak-blast');
    expect(last.transition).toEqual({ type: 'crossfade', durationMs: 250 });
    expect(getDecisions().some((e) => e.input === 'drop detected' && e.result.includes('Drop cut'))).toBe(true);
  });

  test('808 slam cuts the scene even when overall energy stays flat', () => {
    const { d, posts } = setup();
    const t0 = 600000;
    drive(d, t0, 0, 20, () => [0.5, 0.3]);
    drive(d, t0, 20.1, 21, () => [0.5, 0.95]);
    const scenes = posts.filter((p) => p.t === 'scene');
    expect(scenes.length).toBeGreaterThan(0);
    const last = scenes[scenes.length - 1];
    expect(last.visualId).toBe('peak-blast');
    expect(last.transition).toEqual({ type: 'crossfade', durationMs: 250 });
    expect(getDecisions().some((e) => e.input === '808 slam detected')).toBe(true);
  });

  test('mapped drop cuts the scene on the boundary', () => {
    const { d, posts } = setup();
    const t0 = 700000;
    d.setAudio('file', 126, t0, 'test.mp3');
    d.setTrackMap(mockTrackMap());
    drive(d, t0, 20, 35, () => [0.5, 0.5]);
    expect(getDecisions().some((e) => e.step === 'map' && e.result.includes('map hit'))).toBe(true);
    const scenes = posts.filter((p) => p.t === 'scene');
    expect(scenes.length).toBeGreaterThan(0);
    const last = scenes[scenes.length - 1];
    expect(last.visualId).toBe('peak-blast');
    expect(last.transition).toEqual({ type: 'crossfade', durationMs: 250 });
  });

  test('builds re-queue the planner so a plan waits for the drop', async () => {
    const plan: ShowPlan = {
      visualId: 'mid-groove',
      params: [0.5, 0.5, 0.5],
      intensity: 0.9,
      speed: 1.1,
      paletteEmphasis: 0,
      transition: { type: 'crossfade', durationMs: 1500 },
      energyArc: 'peak',
      sectionSeconds: 20,
      reason: 'stub plan',
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(plan)));
    vi.stubGlobal('fetch', fetchMock);
    const { d } = setup();
    const t0 = 800000;
    drive(d, t0, 0, 8, () => [0.3, 0.3]);
    await flush();
    fetchMock.mockClear();
    drive(d, t0, 8.1, 14, ramp);
    await flush();
    expect(fetchMock).toHaveBeenCalled();
  });

  test('stale drops leave the music context after the summary window', () => {
    const { d, views } = setup();
    const t0 = 900000;
    drive(d, t0, 0, 8, () => [0.3, 0.3]);
    drive(d, t0, 8.1, 14, ramp);
    drive(d, t0, 14.1, 15, () => [0.95, 0.95]);
    drive(d, t0, 15.1, 42, () => [0.5, 0.5]);
    expect(views.length).toBeGreaterThan(0);
    expect(views[views.length - 1].events).not.toContain('drop');
  });
});
