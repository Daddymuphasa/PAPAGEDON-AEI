// API smoke: every POST route answers its mock path with well-formed data.
// Runs the real route handlers in-process (no server needed). Live paths
// stay behind AEI_LIVE and are covered by the in-app checks + check:meta.
import { describe, expect, test } from 'vitest';
import { POST as plan } from './show/plan/route';
import { POST as theme } from './theme/route';
import { POST as judge } from './theme/judge/route';
import { POST as shader } from './visuals/shader/route';
import { POST as generate } from './visuals/generate/route';
import { POST as segment } from './vision/segment/route';
import { GET as mode } from './mode/route';
import type { EventTheme, PlannerInput } from '../../../types';

function req(body: unknown): Request {
  return new Request('http://localhost/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const THEME: EventTheme = {
  eventName: 'Smoke Night',
  genre: 'Techno',
  mood: 'electric',
  palette: ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'],
  energy: 0.8,
  motifs: ['neon'],
  typographyFeel: 'bold',
  tempoBpm: { min: 120, max: 130 },
  sceneSwitchSeconds: { min: 4, max: 12 },
  suggestedShaderIds: [],
};

const P = [
  { key: 'p1', label: 'One', min: 0, max: 1, def: 0.5 },
  { key: 'p2', label: 'Two', min: 0, max: 1, def: 0.5 },
  { key: 'p3', label: 'Three', min: 0, max: 1, def: 0.5 },
];

function plannerInput(): PlannerInput {
  return {
    theme: THEME,
    summary: { avgEnergy: 0.8, peakEnergy: 0.9, avgBass: 0.7, avgMid: 0.5, avgHigh: 0.4, events: [], bpm: 126, seconds: 20 },
    current: { visualId: 'a', params: [0.5, 0.5, 0.5], intensity: 0.7, speed: 1, paletteEmphasis: 0 },
    lastPlans: [],
    visualizers: [
      { id: 'a', name: 'A', tags: [], params: P, meta: { themeTags: ['neon'], energyRange: [0.4, 1], moods: ['electric'] } },
      { id: 'b', name: 'B', tags: [], params: P, meta: { themeTags: ['doves'], energyRange: [0, 0.3], moods: ['gentle'] } },
    ],
  };
}

describe('api smoke (mock paths)', () => {
  test('GET mode reports mock by default', async () => {
    const res = await mode();
    expect(res.status).toBe(200);
    const data = (await res.json()) as { live: boolean };
    expect(data.live).toBe(false);
  });

  test('POST show/plan returns a plan for a registered visual', async () => {
    const res = await plan(req({ input: plannerInput() }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { visualId: string; reason: string };
    expect(['a', 'b']).toContain(data.visualId);
    expect(data.reason.length).toBeGreaterThan(0);
  });

  test('POST theme extracts a mock theme', async () => {
    const res = await theme(req({ flyerDataUrl: '' }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as EventTheme;
    expect(data.palette.length).toBeGreaterThanOrEqual(3);
  });

  test('POST theme/judge judges a theme', async () => {
    const res = await judge(req({ flyerDataUrl: '', theme: THEME }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { verdict?: string; pass?: boolean };
    expect(data).toBeDefined();
  });

  test('POST visuals/shader returns GLSL', async () => {
    const res = await shader(req({ theme: null }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { glsl?: unknown };
    expect(typeof data.glsl).toBe('string');
  });

  test('POST visuals/generate returns images', async () => {
    const res = await generate(req({ theme: THEME, count: 2 }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { images?: unknown[] };
    expect(Array.isArray(data.images)).toBe(true);
    expect(data.images!.length).toBeGreaterThan(0);
  });

  test('POST vision/segment segments a frame', async () => {
    const px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await segment(req({ frame: px, width: 64, height: 64 }));
    expect(res.status).toBe(200);
  });

  test('POST vision/segment rejects a bad frame with 400', async () => {
    const res = await segment(req({ frame: 'nope', width: 64, height: 64 }));
    expect(res.status).toBe(400);
  });
});
