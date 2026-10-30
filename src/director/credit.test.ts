import { describe, expect, test } from 'vitest';
import {
  getCredits,
  isCapped,
  recordUsage,
  resetCredits,
  setCallCap,
  setTokenCap,
  totalTokens,
} from './credit';
import type { ModelUsage } from '../types';

const usage = (over: Partial<ModelUsage> = {}): ModelUsage => ({
  calls: 1,
  inputTokens: 100,
  outputTokens: 50,
  reasoningTokens: 10,
  latencyMs: 200,
  mock: false,
  status: 'ok',
  ...over,
});

describe('credit guard', () => {
  test('accumulates usage', () => {
    resetCredits();
    recordUsage(usage());
    recordUsage(usage({ inputTokens: 200 }));
    const s = getCredits();
    expect(s.calls).toBe(2);
    expect(totalTokens(s)).toBe(100 + 50 + 10 + 200 + 50 + 10);
  });

  test('trips the call cap', () => {
    resetCredits();
    setCallCap(2);
    recordUsage(usage());
    expect(isCapped()).toBe(false);
    recordUsage(usage());
    expect(isCapped()).toBe(true);
    expect(getCredits().capped).toBe(true);
    setCallCap(100);
  });

  test('trips the optional token cap', () => {
    resetCredits();
    setTokenCap(200);
    recordUsage(usage());
    expect(isCapped()).toBe(false);
    recordUsage(usage());
    expect(isCapped()).toBe(true);
    setTokenCap(null);
  });

  test('counts mock calls separately without tokens', () => {
    resetCredits();
    recordUsage(usage({ mock: true, inputTokens: 0, outputTokens: 0, reasoningTokens: 0 }));
    const s = getCredits();
    expect(s.mockCalls).toBe(1);
    expect(totalTokens(s)).toBe(0);
  });

  test('reset starts a fresh session but keeps caps', () => {
    setCallCap(5);
    recordUsage(usage());
    resetCredits();
    const s = getCredits();
    expect(s.calls).toBe(0);
    expect(s.capped).toBe(false);
    expect(s.callCap).toBe(5);
    setCallCap(100);
  });
});
