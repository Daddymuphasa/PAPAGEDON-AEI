// INPUT 2 fast layer: local Web Audio API analysis, every frame, no API cost.
import type { AudioFeatures } from '../../types';
import { EnergyBuffer, isBuild, isDrop } from '../../director/energy';
import {
  BPM_INTERVALS,
  adaptiveBeat,
  bandEdges,
  bandMean,
  bpmFromIntervals,
  spectralFlux,
  type BandEdges,
} from './dsp';

export const FFT_SIZE = 2048;
export const FFT_SMOOTHING = 0.35;
const ENERGY_SMOOTH = 0.45; // previous-frame weight for steady meters
const HIST_MAX = 120; // rolling adaptive-beat history (~1.5s at 60fps)

export class LocalAudioAnalyzer {
  private analyser: AnalyserNode | null = null;
  private freq = new Uint8Array(0);
  private cur = new Float32Array(0);
  private prev = new Float32Array(0);
  private edges: BandEdges = bandEdges(48000, FFT_SIZE);
  private energyHist: number[] = [];
  private fluxHist: number[] = [];
  private lastBeatAt = -1e9;
  private beatIntervals: number[] = [];
  private smoothEnergy = 0;
  private ebuf = new EnergyBuffer();
  private wasBuild = false;
  private lastBuildT = -1e9;

  attach(stream: MediaStream, ctx: AudioContext): void {
    this.hookUp(ctx.createMediaStreamSource(stream), ctx, false);
  }

  // M4: file playback through an <audio> element. Audible on the control
  // window; silent analysis tap on the output window (no destination link).
  attachElement(el: HTMLMediaElement, ctx: AudioContext, audible: boolean): void {
    this.hookUp(ctx.createMediaElementSource(el), ctx, audible);
  }

  private hookUp(src: AudioNode, ctx: AudioContext, audible: boolean): void {
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = FFT_SMOOTHING;
    src.connect(this.analyser);
    if (audible) this.analyser.connect(ctx.destination);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.cur = new Float32Array(this.analyser.frequencyBinCount);
    this.prev = new Float32Array(this.analyser.frequencyBinCount);
    this.edges = bandEdges(ctx.sampleRate, FFT_SIZE);
  }

  get live(): boolean {
    return this.analyser !== null;
  }

  frame(now = performance.now()): AudioFeatures {
    if (!this.analyser) return mockFeatures(now / 1000, now);
    this.analyser.getByteFrequencyData(this.freq);
    const n = this.freq.length;
    for (let i = 0; i < n; i++) this.cur[i] = this.freq[i] / 255;
    const subBass = bandMean(this.cur, this.edges.sub[0], this.edges.sub[1]);
    const bass = bandMean(this.cur, this.edges.bass[0], this.edges.bass[1]);
    const mid = bandMean(this.cur, this.edges.mid[0], this.edges.mid[1]);
    const high = bandMean(this.cur, this.edges.high[0], this.edges.high[1]);
    const firstFrame = this.energyHist.length === 0 && this.fluxHist.length === 0;
    const flux = firstFrame
      ? 0
      : spectralFlux(this.prev, this.cur, this.edges.bass[1], this.edges.mid[1]);
    const swap = this.prev;
    this.prev = this.cur;
    this.cur = swap;
    const drive = (subBass + bass) / 2;
    const dec = adaptiveBeat(drive, flux, this.energyHist, this.fluxHist, now, this.lastBeatAt);
    this.energyHist.push(drive);
    this.fluxHist.push(flux);
    if (this.energyHist.length > HIST_MAX) this.energyHist.shift();
    if (this.fluxHist.length > HIST_MAX) this.fluxHist.shift();
    if (dec.beat) {
      if (this.lastBeatAt > 0) {
        this.beatIntervals.push((now - this.lastBeatAt) / 1000);
        if (this.beatIntervals.length > BPM_INTERVALS * 2) this.beatIntervals.shift();
      }
      this.lastBeatAt = now;
    }
    const bpm = bpmFromIntervals(this.beatIntervals);
    const rawEnergy = Math.min(1, subBass * 0.3 + bass * 0.3 + mid * 0.25 + high * 0.15);
    this.smoothEnergy += (rawEnergy - this.smoothEnergy) * (1 - ENERGY_SMOOTH);
    const energy = this.smoothEnergy;
    const t = now / 1000;
    this.ebuf.push(t, energy);
    const buildUp = isBuild(this.ebuf, t);
    const drop = isDrop(this.ebuf, t, this.wasBuild);
    if (buildUp) {
      this.wasBuild = true;
      this.lastBuildT = t;
    } else if (drop || t - this.lastBuildT > 10) {
      this.wasBuild = false;
    }
    return {
      bpm,
      beat: dec.beat,
      onset: dec.beat,
      bass,
      mid,
      high,
      subBass,
      flux,
      beatConfidence: dec.confidence,
      energy,
      buildUp,
      drop,
      timestamp: now,
    };
  }
}

// Deterministic mock features for dev without a mic (MOCK mode).
// With bpm set (M3 gallery), the beat locks to that tempo; otherwise the
// original free-running pattern is kept so M1/M2 behavior never changes.
export function mockFeatures(t: number, now = performance.now(), bpm?: number): AudioFeatures {
  const mid = 0.4 + 0.3 * Math.sin(t * 1.7 + 1);
  const high = 0.3 + 0.25 * Math.sin(t * 3.1 + 2);
  let bass: number;
  let beat: boolean;
  if (bpm === undefined) {
    bass = Math.min(1, Math.max(0, 0.5 + 0.5 * Math.sin(t * 2.4) * Math.sin(t * 0.7)));
    beat = Math.sin(t * 2.4) > 0.92;
  } else {
    const phase = (t * bpm) / 60 % 1;
    beat = phase < 0.12;
    const thump = phase < 0.35 ? (1 - phase / 0.35) * 0.55 : 0;
    bass = Math.min(1, Math.max(0, 0.35 + 0.25 * Math.sin(t * 0.7) + thump));
  }
  const energy = Math.min(1, bass * 0.5 + mid * 0.3 + high * 0.2);
  return {
    bpm: bpm ?? 126,
    beat,
    onset: beat,
    bass,
    mid,
    high,
    subBass: bass * 0.7,
    flux: beat ? 0.03 : 0.004 + 0.002 * Math.sin(t * 7.3),
    beatConfidence: beat ? 0.9 : 0,
    energy,
    buildUp: false,
    drop: false,
    timestamp: now,
  };
}
