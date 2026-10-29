// INPUT 2 fast layer: local Web Audio API analysis, every frame, no API cost.
// BPM + build/drop detection land in M3.
import type { AudioFeatures } from '../../types';

export class LocalAudioAnalyzer {
  private analyser: AnalyserNode | null = null;
  private freq = new Uint8Array(0);
  private lastBeatAt = 0;

  attach(stream: MediaStream, ctx: AudioContext): void {
    const src = ctx.createMediaStreamSource(stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    src.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
  }

  get live(): boolean {
    return this.analyser !== null;
  }

  frame(now = performance.now()): AudioFeatures {
    if (!this.analyser) return mockFeatures(now / 1000, now);
    this.analyser.getByteFrequencyData(this.freq);
    const band = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b && i < this.freq.length; i++) s += this.freq[i];
      return s / (Math.max(1, b - a) * 255);
    };
    const bass = band(1, 8);
    const mid = band(8, 40);
    const high = band(40, 120);
    const energy = Math.min(1, bass * 0.5 + mid * 0.3 + high * 0.2);
    const beat = bass > 0.55 && now - this.lastBeatAt > 280;
    if (beat) this.lastBeatAt = now;
    return { bpm: 0, beat, onset: beat, bass, mid, high, energy, buildUp: false, drop: false, timestamp: now };
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
    energy,
    buildUp: false,
    drop: false,
    timestamp: now,
  };
}
