// Live decision log (M2): visible plan -> act -> observe -> verify trace.
// In-memory only, capped at the last MAX_ENTRIES. Never stores image data.
export type DecisionStep = 'plan' | 'act' | 'observe' | 'verify' | 'local' | 'manual' | 'cap' | 'map' | 'listen';

export interface DecisionEntry {
  id: number;
  time: string;
  step: DecisionStep;
  model: string; // 'muse-spark-1.3' | 'mock' | 'local'
  input: string; // short summary, no raw image data
  result: string;
  verify: { pass: boolean; reason: string } | null;
  retries: number;
  latencyMs: number | null;
}

export const MAX_ENTRIES = 50;

let nextId = 1;
let entries: DecisionEntry[] = [];
const listeners = new Set<() => void>();

function stamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function logDecision(e: Omit<DecisionEntry, 'id' | 'time'>): DecisionEntry {
  const entry: DecisionEntry = { ...e, id: nextId++, time: stamp() };
  entries = [...entries, entry].slice(-MAX_ENTRIES);
  for (const fn of listeners) fn();
  return entry;
}

export function getDecisions(): DecisionEntry[] {
  return entries;
}

export function subscribeDecisions(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function clearDecisions(): void {
  entries = [];
  for (const fn of listeners) fn();
}
