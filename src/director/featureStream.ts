// M4.2 stream helpers: packet guard, beat latch, staleness. Pure.
export interface FeatFields {
  seq: number;
  ts: number;
  bass: number;
  subBass: number;
  mid: number;
  high: number;
  energy: number;
  flux: number;
  beat: boolean;
  beatConfidence: number;
  bpm: number;
  buildUp: boolean;
  drop: boolean;
}

export type FeatPacket = { t: 'feat' } & FeatFields;

export const FEAT_TIMEOUT_MS = 250;

export function isFeatPacket(m: unknown): m is FeatPacket {
  if (typeof m !== 'object' || m === null) return false;
  const p = m as Record<string, unknown>;
  if (p.t !== 'feat') return false;
  const nums = [
    'seq',
    'ts',
    'bass',
    'subBass',
    'mid',
    'high',
    'energy',
    'flux',
    'beatConfidence',
    'bpm',
  ];
  for (const k of nums) if (typeof p[k] !== 'number') return false;
  if (typeof p.beat !== 'boolean') return false;
  if (typeof p.buildUp !== 'boolean' || typeof p.drop !== 'boolean') return false;
  return true;
}

// A beat packet arriving between frames renders exactly once: new beat
// seqs queue up, each frame consumes at most one.
export class BeatLatch {
  private lastSeq = -1;
  private pending = 0;

  push(seq: number, beat: boolean): void {
    if (!beat || seq === this.lastSeq) return;
    this.lastSeq = seq;
    this.pending += 1;
  }

  take(): boolean {
    if (this.pending === 0) return false;
    this.pending -= 1;
    return true;
  }
}

export function isStreamStale(lastFeatAt: number | null, now: number): boolean {
  return lastFeatAt === null || now - lastFeatAt > FEAT_TIMEOUT_MS;
}
