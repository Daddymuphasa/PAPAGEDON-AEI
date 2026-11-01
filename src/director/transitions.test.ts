// Batch-5 Director transitions: 1500ms crossfades everywhere, a fast
// 250ms fade on drop hits (never a cut), and the last-good fallback when
// the planner gives up.
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { AudioFeatures, EventTheme, ShaderDefinition, ShowPlan } from '../types';
import { clearDecisions, getDecisions } from './decisionLog';
import type { ShowBus } from './showBus';
import { ShowDirector, type DirectorView } from './showDirector';

const P3 = [
  { key: 'p1', label: 'One', min: 0, max: 1, def: 0.5 },
  { key: 'p2', label: 'Two', min: 0, max: 1, def: 0.5 },
  { key: 'p3', label: 'Three', min: 0, max: 1, def: 0.5 },
];
const DEFS: ShaderDefinition[] = [
  { id: 'a', name: 'A', fragmentGlsl: '', uniforms: [], params: P3 },
  { id: 'b', name: 'B', fragmentGlsl: '', uniforms: [], params: P3 },
];

const THEME: EventTheme = {
  eventName: 'Test Night',
  genre: 'Techno',
  mood: 'dark',
  palette: ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'],
  energy: 0.8,
  motifs: ['laser'],
  typographyFeel: 'bold',
  tempoBpm: { min: 120, max: 130 },
  sceneSwitchSeconds: { min: 4, max: 12 },
  suggestedShaderIds: [],
};

function feat(energy: number): AudioFeatures {
  return {
    bpm: 126, beat: false, onset: false, bass: 0, mid: 0, high: 0, subBass: 0,
    flux: 0, beatConfidence: 0, energy, buildUp: false, drop: false, timestamp: 0,
  };
}

function setup() {
  const posts: { t: string; [k: string]: unknown }[] = [];
  const views: DirectorView[] = [];
  const bus = { post: (m: never) => posts.push(m as unknown as { t: string }) } as unknown as ShowBus;
  const d = new ShowDirector({ bus, defs: DEFS, getTheme: () => THEME, onUpdate: (v) => views.push(v) });
  return { d, posts, views };
}

const flush = async (n = 30): Promise<void> => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
};

afterEach(() => {
  vi.unstubAllGlobals();
  clearDecisions();
});

describe('director transitions (Batch 5)', () => {
  test('opening posts a 1500ms crossfade', () => {
    const { d, posts } = setup();
    d.opening(THEME);
    const scene = posts.find((p) => p.t === 'scene');
    expect(scene).toBeDefined();
    expect(scene!.visualId).toBe('a');
    expect(scene!.transition).toEqual({ type: 'crossfade', durationMs: 1500 });
  });

  test('manual override posts a 1500ms crossfade', () => {
    const { d, posts } = setup();
    d.manual({ visualId: 'b' });
    const scene = posts.find((p) => p.t === 'scene');
    expect(scene).toBeDefined();
    expect(scene!.visualId).toBe('b');
    expect(scene!.transition).toEqual({ type: 'crossfade', durationMs: 1500 });
  });

  test('drop hit executes the pending plan with a fast 250ms fade', async () => {
    const plan: ShowPlan = {
      visualId: 'b',
      params: [0.5, 0.5, 0.5],
      intensity: 0.7,
      speed: 1,
      paletteEmphasis: 0,
      transition: { type: 'crossfade', durationMs: 1500 },
      energyArc: 'peak',
      sectionSeconds: 30,
      reason: 'stub plan',
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(plan))));
    const { d, posts } = setup();
    d.frame(feat(0.5), 100000); // fires the planner (first frame)
    await flush();
    d.frame(feat(0.85), 100500); // +0.35 jump over peak 0.75 => drop
    await flush();
    const scenes = posts.filter((p) => p.t === 'scene');
    expect(scenes.length).toBeGreaterThan(0);
    const last = scenes[scenes.length - 1];
    expect(last.visualId).toBe('b');
    expect(last.transition).toEqual({ type: 'crossfade', durationMs: 250 });
  });

  test('planner failure keeps the last good shader', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('no server');
    }));
    const { d, posts, views } = setup();
    d.frame(feat(0.5), 100000);
    await flush(60);
    expect(posts.filter((p) => p.t === 'scene')).toHaveLength(0);
    expect(views.length).toBeGreaterThan(0);
    expect(views[views.length - 1].visualId).toBe('a');
    expect(getDecisions().some((e) => e.input === 'planner gave up')).toBe(true);
  });
});
