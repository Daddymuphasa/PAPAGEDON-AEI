// INPUT 2 fast layer: local Web Audio API analysis, every frame, no API cost.
import type { AudioFeatures } from '../../types';
import { EnergyBuffer, isBuild, isDrop } from '../../director/energy';
import {
  BPM_INTERVALS,
  adaptiveBeat,
  bandEdges,
  bandMean,
  bpmFromIntervals,
  rawEnergy,
  spectralFlux,
  type BandEdges,
} from './dsp';
import { CALIBRATE_MS, Calibrator } from './calibration';

export const FFT_SIZE = 2048;
export const FFT_SMOOTHING = 0.35;
const ENERGY_SMOOTH = 0.45; // previous-frame weight for steady meters
const HIST_1S = 60; // ~1s rolling average at 60fps (bass, flux)
const HIST_HALF_S = 30; // ~0.5s rolling average (sub)

export type CalibrationState = 'idle' | 'calibrating' | 'ready';

export class LocalAudioAnalyzer {
  private analyser: AnalyserNode | null = null;
  private freq = new Uint8Array(0);
  private cur = new Float32Array(0);
  private prev = new Float32Array(0);
  private edges: BandEdges = bandEdges(48000, FFT_SIZE);
  private bassHist: number[] = [];
  private fluxHist: number[] = [];
  private subHist: number[] = [];
  private lastBeatAt = -1e9;
  private beatIntervals: number[] = [];
  private smoothEnergy = 0;
  private ebuf = new EnergyBuffer();
  private wasBuild = false;
  private lastBuildT = -1e9;
  private cal = new Calibrator();
  private calState: CalibrationState = 'idle';
  private calStart = 0;

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

  // M6 auto-calibration: listen for ~3s, then set gain/noise floor so
  // quiet and loud rooms both read well. Until ready, identity applies.
  startCalibration(nowMs = performance.now()): void {
    this.cal.start();
    this.calState = 'calibrating';
    this.calStart = nowMs;
  }

  get calibration(): CalibrationState {
    return this.calState;
  }

  frame(now = performance.now()): AudioFeatures {
    if (!this.analyser) return mockFeatures(now / 1000, now);
    this.analyser.getByteFrequencyData(this.freq);
    const n = this.freq.length;
    for (let i = 0; i < n; i++) this.cur[i] = this.freq[i] / 255;
    const raw = {
      subBass: bandMean(this.cur, this.edges.sub[0], this.edges.sub[1]),
      bass: bandMean(this.cur, this.edges.bass[0], this.edges.bass[1]),
      mid: bandMean(this.cur, this.edges.mid[0], this.edges.mid[1]),
      high: bandMean(this.cur, this.edges.high[0], this.edges.high[1]),
    };
    if (this.calState === 'calibrating') {
      this.cal.push(rawEnergy(raw));
      if (now - this.calStart >= CALIBRATE_MS) {
        this.cal.finish();
        this.calState = 'ready';
      }
    }
    const apply = (v: number) => this.cal.apply(v);
    const subBass = apply(raw.subBass);
    const bass = apply(raw.bass);
    const mid = apply(raw.mid);
    const high = apply(raw.high);
    const firstFrame = this.bassHist.length === 0 && this.fluxHist.length === 0;
    const flux = firstFrame
      ? 0
      : spectralFlux(this.prev, this.cur, this.edges.bass[1], this.edges.mid[1]);
    const swap = this.prev;
    this.prev = this.cur;
    this.cur = swap;
    const dec = adaptiveBeat(bass, flux, subBass, this.bassHist, this.fluxHist, this.subHist, now, this.lastBeatAt);
    this.bassHist.push(bass);
    this.fluxHist.push(flux);
    this.subHist.push(subBass);
    if (this.bassHist.length > HIST_1S) this.bassHist.shift();
    if (this.fluxHist.length > HIST_1S) this.fluxHist.shift();
    if (this.subHist.length > HIST_HALF_S) this.subHist.shift();
    if (dec.beat) {
      if (this.lastBeatAt > 0) {
        this.beatIntervals.push((now - this.lastBeatAt) / 1000);
        if (this.beatIntervals.length > BPM_INTERVALS * 2) this.beatIntervals.shift();
      }
      this.lastBeatAt = now;
    }
    const bpm = bpmFromIntervals(this.beatIntervals);
    const frameEnergy = rawEnergy({ subBass, bass, mid, high });
    this.smoothEnergy += (frameEnergy - this.smoothEnergy) * (1 - ENERGY_SMOOTH);
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
