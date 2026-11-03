// ── Originals signal adapter ──────────────────────────────────────────────────
// Maps AEI ExperienceSignals onto the shape the /app originals consume:
// beat as a decaying 0..1 hold (VisionStage's beatHold) plus the nano-hex
// bass-gated pulse. Pure functions + explicit hold state, fully unit-tested.
import type { ExperienceSignals } from '../lib/papagedon/analyzer';

export interface OriginalSignals {
  energy: number;
  bass: number;
  mid: number;
  treble: number;
  /** Decaying beat hold, 1 on a beat frame, -0.1/frame after (matches /app). */
  beat: number;
  /** Nano-hex impact pulse: gated bass on beat frames, else 0. */
  pulse: number;
}

export interface BeatHold {
  value: number;
}

export function createBeatHold(): BeatHold {
  return { value: 0 };
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

export function adaptSignals(s: ExperienceSignals, hold: BeatHold): OriginalSignals {
  hold.value = s.beat ? 1 : Math.max(0, hold.value - 0.1);
  const bass = clamp01(s.bass);
  return {
    energy: clamp01(s.energy),
    bass,
    mid: clamp01(s.mid),
    treble: clamp01(s.treble),
    beat: hold.value,
    pulse: s.beat ? Math.min(1, bass) : 0,
  };
}
