// ── Auto sensitivity ──────────────────────────────────────────────────────────
// AEI-side intelligence between the engine analyzer and the stage. The engine
// analyzer normalizes every band against its own decaying peak, so in a noisy
// room the noise floor itself gets amplified to full strength and everything
// jumps at everything. This stage learns the room instead: it tracks a slow
// noise floor + ceiling per band, gates out sub-floor sound, re-ranges the
// headroom above the noise, and blocks noise-triggered beats. analyzer.ts is
// engine-frozen ("change the engine, then re-port"), so this lives here.
// Modes: auto (learn + balanced curve), calm / balanced / wild (fixed curves
// on top of the learned range).
import type { ExperienceSignals } from '../../lib/papagedon/analyzer';

export type SensitivityMode = 'auto' | 'calm' | 'balanced' | 'wild';

type Band = 'bass' | 'mid' | 'treble' | 'energy';

const BANDS: Band[] = ['bass', 'mid', 'treble', 'energy'];

// Learning rates per update (~60fps): floor learns down instantly (new quiet
// is trusted at once), drifts up over ~8s; ceiling mirrors that upwards.
const FLOOR_RISE = 0.002;
const CEIL_FALL = 0.005;
// Frames before the room counts as learned (~2s).
const LEARN_FRAMES = 120;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

export class AutoSensitivity {
  private floor: Record<Band, number> = { bass: 0.85, mid: 0.85, treble: 0.85, energy: 0.85 };
  private ceil: Record<Band, number> = { bass: 1, mid: 1, treble: 1, energy: 1 };
  private frames = 0;

  reset(): void {
    this.floor = { bass: 0.85, mid: 0.85, treble: 0.85, energy: 0.85 };
    this.ceil = { bass: 1, mid: 1, treble: 1, energy: 1 };
    this.frames = 0;
  }

  /** 'learning' for the first ~2s after a reset/switch, then 'locked'. */
  status(): 'learning' | 'locked' {
    return this.frames < LEARN_FRAMES ? 'learning' : 'locked';
  }

  update(raw: ExperienceSignals, mode: SensitivityMode): ExperienceSignals {
    this.frames += 1;
    const bands: Record<Band, number> = {
      bass: clamp01(raw.bass),
      mid: clamp01(raw.mid),
      treble: clamp01(raw.treble),
      energy: clamp01(raw.energy),
    };
    // Learn the room.
    for (const b of BANDS) {
      const v = bands[b];
      this.floor[b] = v < this.floor[b] ? v : this.floor[b] + (v - this.floor[b]) * FLOOR_RISE;
      this.ceil[b] = v > this.ceil[b] ? v : this.ceil[b] + (v - this.ceil[b]) * CEIL_FALL;
    }
    // Re-range the headroom above the noise, then shape by mode.
    const out = { ...bands };
    for (const b of BANDS) {
      const lo = this.floor[b] * 1.05;
      const t = clamp01((bands[b] - lo) / Math.max(this.ceil[b] - lo, 0.08));
      out[b] = this.curve(t, mode);
    }
    // Beats only count when the bass truly jumps above the room.
    const beat =
      raw.beat && bands.bass > this.floor.bass + 0.1 && bands.energy > this.floor.energy + 0.08;
    // Keep the spectrum coherent with the gated energy.
    const specScale = raw.energy > 1e-3 ? clamp01(out.energy / raw.energy) : 0;
    const spectrum = new Float32Array(raw.spectrum.length);
    for (let i = 0; i < spectrum.length; i++) spectrum[i] = clamp01(raw.spectrum[i] * specScale);
    return {
      ...raw,
      energy: out.energy,
      intensity: clamp01(raw.intensity * specScale),
      bass: out.bass,
      mid: out.mid,
      treble: out.treble,
      beat,
      spectrum,
    };
  }

  private curve(t: number, mode: SensitivityMode): number {
    switch (mode) {
      case 'calm':
        return clamp01(Math.pow(t, 1.5) * 0.8);
      case 'wild':
        return clamp01(Math.pow(t, 0.7) * 1.15);
      case 'balanced':
      case 'auto':
      default:
        return t;
    }
  }
}
