// M4.1 pure DSP helpers. No browser APIs: the analyzer drives these live,
// vitest drives them synthetically. All math written fresh for this repo.

// ---- bands (Hz) ----
export const SUB_HZ: [number, number] = [20, 60];
export const BASS_HZ: [number, number] = [60, 250];
export const MID_HZ: [number, number] = [250, 4000];
export const HIGH_HZ: [number, number] = [4000, 12000];

export interface BandEdges {
  sub: [number, number];
  bass: [number, number];
  mid: [number, number];
  high: [number, number];
}

export function binWidth(sampleRate: number, fftSize: number): number {
  return sampleRate / fftSize;
}

// Inclusive bin range covering [loHz, hiHz); DC bin 0 skipped, top clamped.
export function bandBins(
  loHz: number,
  hiHz: number,
  sampleRate: number,
  fftSize: number,
): [number, number] {
  const w = binWidth(sampleRate, fftSize);
  const binCount = fftSize / 2;
  const lo = Math.max(1, Math.ceil(loHz / w));
  const hi = Math.min(binCount - 1, Math.floor((hiHz - 1e-6) / w));
  return [lo, Math.max(lo, hi)];
}

export function bandEdges(sampleRate: number, fftSize: number): BandEdges {
  return {
    sub: bandBins(SUB_HZ[0], SUB_HZ[1], sampleRate, fftSize),
    bass: bandBins(BASS_HZ[0], BASS_HZ[1], sampleRate, fftSize),
    mid: bandBins(MID_HZ[0], MID_HZ[1], sampleRate, fftSize),
    high: bandBins(HIGH_HZ[0], HIGH_HZ[1], sampleRate, fftSize),
  };
}

export function bandMean(data: ArrayLike<number>, lo: number, hi: number): number {
  let s = 0;
  for (let i = lo; i <= hi; i++) s += data[i];
  return s / Math.max(1, hi - lo + 1);
}

// ---- spectral flux ----
export const FLUX_W_LOW = 1.0;
export const FLUX_W_MID = 0.6;
export const FLUX_W_HIGH = 0.25;

// Mean positive per-bin increase between normalized spectra (0-1), weighted
// toward low and mid. lowEnd/midEnd are the last bin indices of those bands.
export function spectralFlux(
  prev: ArrayLike<number>,
  cur: ArrayLike<number>,
  lowEnd: number,
  midEnd: number,
): number {
  const n = cur.length;
  let s = 0;
  for (let i = 1; i < n; i++) {
    const d = cur[i] - prev[i];
    if (d <= 0) continue;
    s += d * (i <= lowEnd ? FLUX_W_LOW : i <= midEnd ? FLUX_W_MID : FLUX_W_HIGH);
  }
  return s / Math.max(1, n - 1);
}

// ---- adaptive beat (M6 either-or rule) ----
export const BEAT_BASS_K = 1.15; // bass vs its ~1s rolling average
export const BEAT_FLUX_K = 1.2; // flux vs its own ~1s average
export const BEAT_SUB_K = 1.3; // sub vs its ~0.5s average
export const BEAT_FLOOR_BASS = 0.05;
export const BEAT_FLOOR_FLUX = 0.004;
export const BEAT_FLOOR_SUB = 0.1;
export const BEAT_COOLDOWN_MS = 120;

export interface BeatDecision {
  beat: boolean;
  confidence: number; // 0-1
}

// Fires when the kick arm hits (bass AND flux above their rolling
// averages) OR the sub arm hits (sub alone, for 808s). Histories are
// past samples only (oldest-first, current frame excluded); the caller
// sizes them (~1s bass/flux, ~0.5s sub). Absolute floors keep silence
// and hiss from ever triggering.
export function adaptiveBeat(
  bass: number,
  flux: number,
  subBass: number,
  bassHist: number[],
  fluxHist: number[],
  subHist: number[],
  nowMs: number,
  lastBeatMs: number,
): BeatDecision {
  const none = { beat: false, confidence: 0 };
  if (nowMs - lastBeatMs < BEAT_COOLDOWN_MS) return none;
  if (bassHist.length < 2 || fluxHist.length < 2 || subHist.length < 2) return none;
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const margin = (v: number, hist: number[], k: number) =>
    Math.min(1, Math.max(0, (v / Math.max(1e-6, mean(hist)) - 1) / (k - 1)));
  let confidence = 0;
  // Kick arm: thump plus fresh spectral change.
  if (bass >= BEAT_FLOOR_BASS && flux >= BEAT_FLOOR_FLUX) {
    const bRatio = bass / Math.max(1e-6, mean(bassHist));
    const fRatio = flux / Math.max(1e-6, mean(fluxHist));
    if (bRatio >= BEAT_BASS_K && fRatio >= BEAT_FLUX_K) {
      confidence = Math.max(confidence, (margin(bass, bassHist, BEAT_BASS_K) + margin(flux, fluxHist, BEAT_FLUX_K)) / 2);
    }
  }
  // Sub arm: 808-style drops with no midrange thump.
  if (subBass >= BEAT_FLOOR_SUB) {
    const sRatio = subBass / Math.max(1e-6, mean(subHist));
    if (sRatio >= BEAT_SUB_K) {
      confidence = Math.max(confidence, margin(subBass, subHist, BEAT_SUB_K));
    }
  }
  if (confidence <= 0) return none;
  return { beat: true, confidence };
}

// ---- band-weighted energy (M6) ----
// Raw per-frame energy from the four bands. The analyzer smooths this
// for meters and detection; render paths run it through an Envelope.
export const ENERGY_W_SUB = 0.3;
export const ENERGY_W_BASS = 0.3;
export const ENERGY_W_MID = 0.25;
export const ENERGY_W_HIGH = 0.15;

export function rawEnergy(b: { subBass: number; bass: number; mid: number; high: number }): number {
  return Math.min(1, b.subBass * ENERGY_W_SUB + b.bass * ENERGY_W_BASS + b.mid * ENERGY_W_MID + b.high * ENERGY_W_HIGH);
}

// ---- fast-attack / slow-release envelope (M6) ----
// Uniforms follow this instead of the heavily smoothed energy: attacks
// land in ~15ms, decays ease out over ~220ms. dt-driven (no clock
// inside) so it stays deterministic and unit-testable.
export const ENV_ATTACK_MS = 15;
export const ENV_RELEASE_MS = 220;

export class Envelope {
  private v = 0;
  private init = false;

  constructor(
    private attackMs: number = ENV_ATTACK_MS,
    private releaseMs: number = ENV_RELEASE_MS,
  ) {}

  step(target: number, dtMs: number): number {
    if (!this.init) {
      this.init = true;
      this.v = target;
      return this.v;
    }
    const tau = target > this.v ? this.attackMs : this.releaseMs;
    const k = 1 - Math.exp(-Math.max(0, dtMs) / Math.max(1e-6, tau));
    this.v += (target - this.v) * k;
    return this.v;
  }

  get value(): number {
    return this.v;
  }

  reset(): void {
    this.v = 0;
    this.init = false;
  }
}

// ---- BPM ----
export const BPM_MIN = 60;
export const BPM_MAX = 200;
export const BPM_FOLD_LO = 80;
export const BPM_FOLD_HI = 170;
export const BPM_INTERVALS = 8;
export const BPM_MIN_INTERVALS = 4;
export const BPM_SPREAD = 0.25;

export function foldBpm(bpm: number): number {
  let b = bpm;
  while (b < BPM_FOLD_LO) b *= 2;
  while (b > BPM_FOLD_HI) b /= 2;
  return b;
}

// Integer BPM from inter-beat intervals (seconds), or 0 until confident:
// enough in-range intervals with a tight spread.
export function bpmFromIntervals(intervals: number[]): number {
  const valid = intervals.filter((iv) => {
    const bpm = 60 / iv;
    return bpm >= BPM_MIN && bpm <= BPM_MAX;
  });
  const tail = valid.slice(-BPM_INTERVALS);
  if (tail.length < BPM_MIN_INTERVALS) return 0;
  const sorted = [...tail].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const spread = (sorted[sorted.length - 1] - sorted[0]) / median;
  if (spread > BPM_SPREAD) return 0;
  return Math.round(foldBpm(60 / median));
}
