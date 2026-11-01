/**
 * Browser port of PAPAGEDON-CORE- audio analysis.
 *
 * Faithful line-by-line TypeScript translation of:
 *   - engine/audio/SimpleFFT.h          (radix-2 Cooley-Tukey FFT)
 *   - engine/audio/AudioAnalyzer.cpp    (bands, adaptive norm, beat + tempo)
 *   - engine/audio/ExperienceSignals.h  (output shape)
 * from https://github.com/Daddymuphasa/PAPAGEDON-CORE- (branch feat/theme-system,
 * commit 4551dc4). Constants and maths are kept identical so the browser and the
 * native player react to the same music the same way. Do not "improve" this
 * file independently of the engine: change the engine, then re-port.
 */

export const kSpectrumBandCount = 64;
export const kWaveformSampleCount = 128;

export type ExperienceSignals = {
  energy: number;
  intensity: number;
  bass: number; // 20 Hz - 250 Hz
  mid: number; // 250 Hz - 4000 Hz
  treble: number; // 4000 Hz - 20000 Hz
  beat: boolean;
  bpm: number;
  tension: number;
  confidence: number;
  spectrum: Float32Array; // kSpectrumBandCount, 0..1
  waveform: Float32Array; // kWaveformSampleCount, -1..1
};

export function emptySignals(): ExperienceSignals {
  return {
    energy: 0,
    intensity: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    beat: false,
    bpm: 0,
    tension: 0,
    confidence: 0,
    spectrum: new Float32Array(kSpectrumBandCount),
    waveform: new Float32Array(kWaveformSampleCount),
  };
}

/** One interleaved PCM window (engine/audio/AudioFrame.h). */
export type AudioFrame = {
  samples: Float32Array;
  sampleRate: number;
  channelCount: number;
  /** Position on the audio clock in seconds (not the render clock). */
  timestampSeconds: number;
};

// ── engine/audio/SimpleFFT.h ──────────────────────────────────────────────────
export class SimpleFFT {
  readonly size: number;
  private readonly twRe: Float32Array;
  private readonly twIm: Float32Array;
  private readonly bitReverse: Uint32Array;
  readonly re: Float32Array;
  readonly im: Float32Array;

  constructor(size: number) {
    let n = 1;
    while (n < size) n <<= 1;
    this.size = n;
    this.twRe = new Float32Array(n / 2);
    this.twIm = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      const angle = (-2.0 * Math.PI * i) / n;
      this.twRe[i] = Math.cos(angle);
      this.twIm[i] = Math.sin(angle);
    }
    this.bitReverse = new Uint32Array(n);
    let log2n = 0;
    while (1 << log2n < n) log2n++;
    for (let i = 0; i < n; i++) {
      let rev = 0;
      for (let j = 0; j < log2n; j++) if ((i >> j) & 1) rev |= 1 << (log2n - 1 - j);
      this.bitReverse[i] = rev;
    }
    this.re = new Float32Array(n);
    this.im = new Float32Array(n);
  }

  /** Real input -> complex output in this.re / this.im. */
  execute(input: Float32Array): void {
    const { size, re, im } = this;
    for (let i = 0; i < size; i++) {
      re[this.bitReverse[i]] = i < input.length ? input[i] : 0;
      im[this.bitReverse[i]] = 0;
    }
    for (let len = 2; len <= size; len <<= 1) {
      const half = len >> 1;
      const step = size / len;
      for (let i = 0; i < size; i += len) {
        for (let j = 0; j < half; j++) {
          const wr = this.twRe[j * step];
          const wi = this.twIm[j * step];
          const a = i + j;
          const b = a + half;
          const vr = re[b] * wr - im[b] * wi;
          const vi = re[b] * wi + im[b] * wr;
          const ur = re[a];
          const ui = im[a];
          re[a] = ur + vr;
          im[a] = ui + vi;
          re[b] = ur - vr;
          im[b] = ui - vi;
        }
      }
    }
  }
}

// ── engine/audio/AudioAnalyzer.cpp ────────────────────────────────────────────
const kFftSize = 1024;
const kBeatHistorySize = 43;
const kBeatThresholdMultiplier = 1.4;
const kBeatOnsetThreshold = 0.12;
const kMinBeatIntervalSeconds = 0.15;
const kTempoMinInterval = 0.3;
const kTempoMaxInterval = 1.5;
const kTempoHistorySize = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export class AudioAnalyzer {
  static readonly fftSize = kFftSize;

  private latest: ExperienceSignals = emptySignals();
  private readonly fft = new SimpleFFT(kFftSize);
  private readonly mono = new Float32Array(kFftSize);

  private bassHistorySum = 0;
  private readonly bassHistory = new Float32Array(kBeatHistorySize);
  private bassHistoryIndex = 0;
  private previousBass = 0;
  private previousTransient = 0;
  private lastAnalysisTime = -1;

  private lastBeatTimeSeconds = -1;
  private beatBpmHistory: number[] = [];
  private beatBpmIndex = 0;
  private currentBpm = 0;

  // AdaptiveNorm takes `float& peak` in C++; here peaks live in a record.
  private peaks = { bass: 0, mid: 0, treble: 0, energy: 0, intensity: 0, spectrum: 0 };

  private adaptiveNorm(raw: number, key: keyof AudioAnalyzer["peaks"]): number {
    const peak = Math.max(raw, this.peaks[key] * 0.9992);
    this.peaks[key] = peak;
    if (raw < 1.0e-4) return 0;
    const n = raw / Math.max(peak, 1.0e-4);
    return clamp(Math.pow(n, 0.75), 0, 1);
  }

  latestSignals(): ExperienceSignals {
    return this.latest;
  }

  reset(): void {
    this.latest = emptySignals();
    this.bassHistory.fill(0);
    this.bassHistorySum = 0;
    this.bassHistoryIndex = 0;
    this.previousBass = 0;
    this.previousTransient = 0;
    this.lastAnalysisTime = -1;
    this.lastBeatTimeSeconds = -1;
    this.beatBpmHistory = [];
    this.beatBpmIndex = 0;
    this.currentBpm = 0;
    this.peaks = { bass: 0, mid: 0, treble: 0, energy: 0, intensity: 0, spectrum: 0 };
  }

  update(frame: AudioFrame): ExperienceSignals {
    this.latest = this.analyze(frame);
    return this.latest;
  }

  private analyze(frame: AudioFrame): ExperienceSignals {
    const { samples, sampleRate, channelCount } = frame;
    if (!(sampleRate > 0 && channelCount > 0) || samples.length === 0) return emptySignals();

    const numFrames = Math.floor(samples.length / channelCount);
    if (numFrames === 0) return emptySignals();
    if (frame.timestampSeconds > 0 && frame.timestampSeconds === this.lastAnalysisTime) {
      return { ...this.latest, beat: false };
    }
    this.lastAnalysisTime = frame.timestampSeconds;

    // 1. Downmix to mono and apply Hann window
    const copySize = Math.min(numFrames, kFftSize);
    this.mono.fill(0);
    const startFrame = numFrames - copySize;
    let totalAmplitude = 0;
    let transientAmplitude = 0;
    const fastWindow = Math.min(copySize, 128);

    for (let i = 0; i < copySize; i++) {
      let mono = 0;
      for (let c = 0; c < channelCount; c++) mono += samples[(startFrame + i) * channelCount + c];
      mono /= channelCount;
      totalAmplitude += clamp(Math.abs(mono), 0, 1);
      if (i >= copySize - fastWindow) transientAmplitude += Math.abs(mono);
      const window = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (kFftSize - 1)));
      this.mono[i] = mono * window;
    }

    const transient = transientAmplitude / fastWindow;
    const energy = Math.max(totalAmplitude / copySize, transient * 0.85);

    // 2. FFT
    this.fft.execute(this.mono);
    const { re, im } = this.fft;

    // 3. Magnitude spectrum grouped into bands
    const nyquist = sampleRate / 2;
    const binResolution = sampleRate / kFftSize;
    let bassEnergy = 0, midEnergy = 0, trebleEnergy = 0;
    let bassCount = 0, midCount = 0, trebleCount = 0;
    const rawSpectrum = new Float32Array(kSpectrumBandCount);
    const outSpectrum = new Float32Array(kSpectrumBandCount);
    const outWaveform = new Float32Array(kWaveformSampleCount);

    for (let i = 0; i < kFftSize / 2; i++) {
      const freq = i * binResolution;
      const magnitude = Math.hypot(re[i], im[i]) / (kFftSize / 2);
      if (freq >= 20 && freq < 250) {
        bassEnergy += magnitude;
        bassCount++;
      } else if (freq >= 250 && freq < 4000) {
        midEnergy += magnitude;
        midCount++;
      } else if (freq >= 4000 && freq < 20000) {
        trebleEnergy += magnitude;
        trebleCount++;
      }
      if (freq >= 20 && freq <= nyquist) {
        const normFreq = clamp(freq / Math.max(nyquist, 1), 0, 0.999);
        const band = Math.min(Math.floor(normFreq * kSpectrumBandCount), kSpectrumBandCount - 1);
        rawSpectrum[band] += magnitude;
      }
    }
    if (bassCount > 0) bassEnergy /= bassCount;
    if (midCount > 0) midEnergy /= midCount;
    if (trebleCount > 0) trebleEnergy /= trebleCount;

    const rawBass = bassEnergy;
    const rawMid = midEnergy;
    const rawTreble = trebleEnergy;
    bassEnergy = clamp(bassEnergy * 15, 0, 1);

    // 4. Beat detection: level spike, bass onset, or fast transient onset
    const averageBass = this.bassHistorySum / kBeatHistorySize;
    const bassFlux = bassEnergy - this.previousBass;
    this.previousBass = bassEnergy;
    const levelSpike = bassEnergy > averageBass * kBeatThresholdMultiplier && bassEnergy > 0.15;
    const onsetSpike = bassFlux > kBeatOnsetThreshold && bassEnergy > 0.22;
    const fastOnset =
      transient > 0.015 &&
      transient - this.previousTransient > Math.max(0.012, this.previousTransient * 0.65);
    this.previousTransient = transient;
    const bassSpike = levelSpike || onsetSpike || fastOnset;

    this.bassHistorySum -= this.bassHistory[this.bassHistoryIndex];
    this.bassHistory[this.bassHistoryIndex] = bassEnergy;
    this.bassHistorySum += bassEnergy;
    this.bassHistoryIndex = (this.bassHistoryIndex + 1) % kBeatHistorySize;

    // 5. Time-gated beats + tempo on the audio clock
    const now = frame.timestampSeconds;
    if (now < this.lastBeatTimeSeconds) this.lastBeatTimeSeconds = -1;
    let beat = false;
    if (bassSpike) {
      const firstBeat = this.lastBeatTimeSeconds < 0;
      const sinceLast = now - this.lastBeatTimeSeconds;
      if (firstBeat || sinceLast >= kMinBeatIntervalSeconds) {
        beat = true;
        if (!firstBeat) this.updateTempo(sinceLast);
        this.lastBeatTimeSeconds = now;
      }
    }

    const outBass = this.adaptiveNorm(rawBass, "bass");
    const outMid = this.adaptiveNorm(rawMid, "mid");
    const outTreble = this.adaptiveNorm(rawTreble, "treble");
    const outEnergy = this.adaptiveNorm(energy, "energy");
    const outIntensity = this.adaptiveNorm(rawMid + rawTreble, "intensity");

    let maxSpectrum = 0;
    for (let i = 0; i < kSpectrumBandCount; i++) maxSpectrum = Math.max(maxSpectrum, rawSpectrum[i]);
    this.peaks.spectrum = Math.max(maxSpectrum, this.peaks.spectrum * 0.997);
    for (let i = 0; i < kSpectrumBandCount; i++) {
      const n = rawSpectrum[i] / Math.max(this.peaks.spectrum, 1.0e-5);
      outSpectrum[i] = clamp(Math.pow(n, 0.55), 0, 1);
    }

    for (let i = 0; i < kWaveformSampleCount; i++) {
      const src = Math.min(Math.floor((i * copySize) / kWaveformSampleCount), copySize > 0 ? copySize - 1 : 0);
      let sample = 0;
      for (let ch = 0; ch < channelCount; ch++) sample += samples[(startFrame + src) * channelCount + ch];
      outWaveform[i] = clamp(sample / channelCount, -1, 1);
    }

    return {
      energy: outEnergy,
      intensity: outIntensity,
      bass: outBass,
      mid: outMid,
      treble: outTreble,
      beat,
      bpm: this.currentBpm,
      tension: outEnergy * 0.5,
      confidence: 1,
      spectrum: outSpectrum,
      waveform: outWaveform,
    };
  }

  private updateTempo(intervalSeconds: number): void {
    if (intervalSeconds < kTempoMinInterval || intervalSeconds > kTempoMaxInterval) return;
    const bpm = 60 / intervalSeconds;
    if (this.beatBpmHistory.length < kTempoHistorySize) {
      this.beatBpmHistory.push(bpm);
    } else {
      this.beatBpmHistory[this.beatBpmIndex] = bpm;
      this.beatBpmIndex = (this.beatBpmIndex + 1) % kTempoHistorySize;
    }
    const sorted = [...this.beatBpmHistory].sort((a, b) => a - b);
    this.currentBpm = sorted[Math.floor(sorted.length / 2)];
  }
}
