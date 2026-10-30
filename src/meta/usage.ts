// M4 usage slot: every Meta call stashes one entry here; the route that
// triggered it takes it for the x-aei-usage header. Server-side only.
import type { ModelUsage } from '../types';

let last: ModelUsage | null = null;

export function stashUsage(u: ModelUsage): void {
  last = u;
}

export function takeLastUsage(): ModelUsage | null {
  const u = last;
  last = null;
  return u;
}

// Mock calls record zero-token usage marked as mock (M4 credit guard).
export function mockUsage(): ModelUsage {
  return {
    calls: 1,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    latencyMs: 0,
    mock: true,
    status: 'mock',
  };
}
