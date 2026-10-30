// M4 credit guard (client): totals every Meta call's usage, enforces a
// session call cap plus an optional token cap. Subscribe-based like the log.
import type { ModelUsage } from '../types';

export const DEFAULT_CALL_CAP = 100;

export interface CreditState {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  mockCalls: number;
  callCap: number;
  tokenCap: number | null;
  capped: boolean;
}

let state: CreditState = {
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  mockCalls: 0,
  callCap: DEFAULT_CALL_CAP,
  tokenCap: null,
  capped: false,
};

const listeners = new Set<() => void>();
function emit() {
  for (const fn of listeners) fn();
}

export function totalTokens(s: CreditState = state): number {
  return s.inputTokens + s.outputTokens + s.reasoningTokens;
}

export function isCapped(s: CreditState = state): boolean {
  if (s.calls >= s.callCap) return true;
  return s.tokenCap !== null && totalTokens(s) >= s.tokenCap;
}

export function recordUsage(u: ModelUsage): CreditState {
  state = {
    ...state,
    calls: state.calls + u.calls,
    inputTokens: state.inputTokens + u.inputTokens,
    outputTokens: state.outputTokens + u.outputTokens,
    reasoningTokens: state.reasoningTokens + u.reasoningTokens,
    mockCalls: state.mockCalls + (u.mock ? u.calls : 0),
  };
  state = { ...state, capped: isCapped(state) };
  emit();
  return state;
}

export function setCallCap(n: number): CreditState {
  state = { ...state, callCap: Math.max(1, Math.floor(n)), capped: false };
  state = { ...state, capped: isCapped(state) };
  emit();
  return state;
}

export function setTokenCap(n: number | null): CreditState {
  state = { ...state, tokenCap: n === null ? null : Math.max(1, Math.floor(n)) };
  state = { ...state, capped: isCapped(state) };
  emit();
  return state;
}

export function resetCredits(): CreditState {
  state = { ...state, calls: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, mockCalls: 0, capped: false };
  emit();
  return state;
}

export function getCredits(): CreditState {
  return state;
}

export function subscribeCredits(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
