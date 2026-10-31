import { describe, expect, test } from 'vitest';
import { mockTheme } from '../meta/mock';
import { recordUsage, resetCredits, setCallCap, setTokenCap } from '../director/credit';
import {
  creditBlockReason,
  getCachedVisuals,
  requestVisuals,
  setCachedVisuals,
} from './generate';

describe('image credit guard', () => {
  test('allows generation when under the caps', () => {
    resetCredits();
    setCallCap(100);
    setTokenCap(null);
    expect(creditBlockReason()).toBeNull();
  });

  test('blocks on the call cap', () => {
    resetCredits();
    setCallCap(4);
    recordUsage({ calls: 4, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, latencyMs: 0, mock: false, status: 'ok' });
    expect(creditBlockReason()).toContain('call cap reached');
    setCallCap(100);
  });

  test('blocks on the token cap', () => {
    resetCredits();
    setTokenCap(50);
    recordUsage({ calls: 1, inputTokens: 60, outputTokens: 0, reasoningTokens: 0, latencyMs: 0, mock: false, status: 'ok' });
    expect(creditBlockReason()).toContain('token cap reached');
    setTokenCap(null);
  });

  test('requestVisuals refuses without touching the network when capped', async () => {
    resetCredits();
    setCallCap(1);
    recordUsage({ calls: 1, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, latencyMs: 0, mock: false, status: 'ok' });
    await expect(requestVisuals(mockTheme, ['calm'])).rejects.toThrow('blocked');
    setCallCap(100);
  });
});

describe('visuals cache', () => {
  test('round-trips a set per theme without generating', () => {
    const images = [
      { id: 'evt-calm-x', prompt: 'p', energyTag: 'calm' as const, dataUrl: 'data:image/png;base64,AA', source: 'mock' as const },
    ];
    expect(getCachedVisuals(mockTheme, ['calm'])).toBeNull();
    setCachedVisuals(mockTheme, ['calm'], images);
    expect(getCachedVisuals(mockTheme, ['calm'])).toEqual(images);
    expect(getCachedVisuals({ ...mockTheme, mood: 'other' }, ['calm'])).toBeNull();
  });
});
