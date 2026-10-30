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

// ---- adaptive beat ----
export const BEAT_HISTORY_S = 1.5;
export const BEAT_K_ENERGY = 1.35;
export const BEAT_K_FLUX = 1.5;
export const BEAT_FLOOR_ENERGY = 0.08;
export const BEAT_FLOOR_FLUX = 0.004;
export const BEAT_COOLDOWN_MS = 120;

export interface BeatDecision {
  beat: boolean;
  confidence: number; // 0-1
}

// Fires when energy and flux both exceed mean x k plus an absolute floor.
// Histories are past samples only (oldest-first, current frame excluded).
export function adaptiveBeat(
  energy: number,
  flux: number,
  energyHist: number[],
  fluxHist: number[],
  nowMs: number,
  lastBeatMs: number,
): BeatDecision {
  const none = { beat: false, confidence: 0 };
  if (nowMs - lastBeatMs < BEAT_COOLDOWN_MS) return none;
  if (energyHist.length < 2 || fluxHist.length < 2) return none;
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const eRatio = energy / Math.max(1e-6, mean(energyHist));
  const fRatio = flux / Math.max(1e-6, mean(fluxHist));
  if (energy < BEAT_FLOOR_ENERGY || flux < BEAT_FLOOR_FLUX) return none;
  if (eRatio < BEAT_K_ENERGY || fRatio < BEAT_K_FLUX) return none;
  const eMargin = (eRatio - 1) / (BEAT_K_ENERGY - 1);
  const fMargin = (fRatio - 1) / (BEAT_K_FLUX - 1);
  return { beat: true, confidence: Math.min(1, Math.max(0, (eMargin + fMargin) / 2)) };
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
