import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ModelUsage, SegResultData } from '../types';
import { DEFAULT_CALL_CAP, getCredits, recordUsage, resetCredits, setCallCap } from '../director/credit';
import { encodeGrid } from './signals';
import { VisionTickState, largestBox, visionBlockReason } from './client';

function grid4(lit: number[]): string {
  const g = new Uint8Array(16);
  for (const i of lit) g[i] = 1;
  return encodeGrid(g);
}

function segResult(perfBox: boolean, crowdLit: number[]): SegResultData {
  return {
    performer: {
      boxes: perfBox ? [{ x0: 0.2, y0: 0.2, x1: 0.4, y1: 0.4 }] : [],
      mask: { w: 4, h: 4, data: grid4(perfBox ? [5, 6, 9, 10] : []) },
      count: perfBox ? 1 : 0,
    },
    crowd: { boxes: [], mask: { w: 4, h: 4, data: grid4(crowdLit) }, count: 0 },
  };
}

const USAGE: ModelUsage = {
  calls: 2,
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  latencyMs: 5,
  mock: true,
  status: 'mock',
};

function stubSeg(body: SegResultData, status = 200): void {
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'x-aei-usage': JSON.stringify(USAGE), 'x-aei-model': 'mock' },
      }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetCredits();
  setCallCap(DEFAULT_CALL_CAP);
});

describe('largestBox', () => {
  test('picks the max-area box, null when empty', () => {
    expect(largestBox([])).toBeNull();
    const small = { x0: 0, y0: 0, x1: 0.1, y1: 0.1 };
    const big = { x0: 0, y0: 0, x1: 0.5, y1: 0.5 };
    expect(largestBox([small, big])).toBe(big);
  });
});

describe('visionBlockReason', () => {
  test('null when fresh, message when capped', () => {
    expect(visionBlockReason()).toBeNull();
    setCallCap(1);
    recordUsage({ ...USAGE, calls: 1 });
    expect(visionBlockReason()).toBe('call cap reached (1/1)');
  });
});

describe('VisionTickState', () => {
  test('first tick reports smoothed signals and records usage', async () => {
    stubSeg(segResult(true, [0, 1, 2, 3, 4, 5, 6, 7]));
    const st = new VisionTickState();
    const tick = await st.tick('data:image/jpeg;base64,xx', 640, 480);
    expect(tick.model).toBe('mock');
    expect(tick.signals.performerPresent).toBe(true);
    expect(tick.signals.performerBox).toEqual({ x0: 0.2, y0: 0.2, x1: 0.4, y1: 0.4 });
    expect(tick.signals.crowdCoverage).toBe(0.25); // eased 0 -> 0.5
    expect(tick.signals.crowdMotion).toBe(0); // no previous mask yet
    expect(getCredits().calls).toBe(2);
  });

  test('motion compares consecutive crowd masks', async () => {
    stubSeg(segResult(true, [0, 1, 2, 3, 4, 5, 6, 7]));
    const st = new VisionTickState();
    await st.tick('data:image/jpeg;base64,xx', 640, 480);
    stubSeg(segResult(true, [8, 9, 10, 11, 12, 13, 14, 15]));
    const tick = await st.tick('data:image/jpeg;base64,xx', 640, 480);
    expect(tick.signals.crowdMotion).toBe(0.5); // eased 0 -> 1.0
    expect(tick.signals.crowdCoverage).toBeCloseTo(0.375, 9); // eased 0.25 -> 0.5
  });

  test('a capped tick throws before any network', async () => {
    setCallCap(1);
    recordUsage({ ...USAGE, calls: 1 });
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: unknown) => {
      calls.push(String(url));
      return new Response('{}');
    });
    const st = new VisionTickState();
    await expect(st.tick('data:image/jpeg;base64,xx', 640, 480)).rejects.toThrow(/blocked/);
    expect(calls).toEqual([]);
  });

  test('route errors and bad payloads throw for the last-good fallback', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 502 }));
    const st = new VisionTickState();
    await expect(st.tick('data:image/jpeg;base64,xx', 640, 480)).rejects.toThrow(/failed: 502/);
    stubSeg({ performer: { boxes: [], mask: { w: 4, h: 4, data: grid4([]) }, count: 9 } } as unknown as SegResultData);
    await expect(st.tick('data:image/jpeg;base64,xx', 640, 480)).rejects.toThrow(/invalid/);
  });
});
