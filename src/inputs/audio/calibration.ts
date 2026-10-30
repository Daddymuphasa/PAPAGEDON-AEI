// M6 auto-calibration: listen ~3s, then set gain/noise floor so quiet
// and loud rooms both read well. Pure math; the analyzer drives it live,
// vitest drives it synthetically. All math written fresh for this repo.
export const CALIBRATE_MS = 3000;
export const CAL_TARGET = 0.5; // map loud-room p90 energy here
export const CAL_GAIN_MIN = 0.5;
export const CAL_GAIN_MAX = 4;
export const CAL_SILENCE = 0.05; // p90 below this: keep unity defaults
export const CAL_FLOOR_MAX = 0.3;

export interface CalSettings {
  gain: number;
  floor: number;
}

const UNITY: CalSettings = { gain: 1, floor: 0 };

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = Math.min(sorted.length - 1, Math.max(0, q * (sorted.length - 1)));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export class Calibrator {
  private samples: number[] = [];
  private done = false;
  private settings: CalSettings = { ...UNITY };

  start(): void {
    this.samples = [];
    this.done = false;
    this.settings = { ...UNITY };
  }

  push(v: number): void {
    if (!this.done && Number.isFinite(v)) this.samples.push(Math.max(0, v));
  }

  get sampleCount(): number {
    return this.samples.length;
  }

  get ready(): boolean {
    return this.done;
  }

  get current(): CalSettings {
    return { ...this.settings };
  }

  // Floor from the quiet end (p10), gain mapping the loud end (p90)
  // onto CAL_TARGET. Near-silence keeps unity so noise isn't boosted.
  finish(): CalSettings {
    const sorted = [...this.samples].sort((a, b) => a - b);
    const p90 = quantile(sorted, 0.9);
    if (sorted.length === 0 || p90 < CAL_SILENCE) {
      this.settings = { ...UNITY };
    } else {
      const floor = Math.min(CAL_FLOOR_MAX, Math.max(0, quantile(sorted, 0.1)));
      const gain = Math.min(CAL_GAIN_MAX, Math.max(CAL_GAIN_MIN, CAL_TARGET / Math.max(1e-3, p90 - floor)));
      this.settings = { gain, floor };
    }
    this.done = true;
    return this.current;
  }

  apply(v: number): number {
    if (!Number.isFinite(v)) return 0;
    return Math.min(1, Math.max(0, (v - this.settings.floor) * this.settings.gain));
  }
}
