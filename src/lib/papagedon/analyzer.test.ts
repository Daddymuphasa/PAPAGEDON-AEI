import { expect, test } from 'vitest';
import { AudioAnalyzer, SimpleFFT } from './analyzer';
import { ExperienceGraph } from './experienceGraph';

test('SimpleFFT matches a naive DFT', () => {
  const n = 64;
  const x = new Float32Array(n).map((_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1));
  const fft = new SimpleFFT(n);
  fft.execute(x);
  for (let k = 0; k < n; k++) {
    let re = 0, im = 0;
    for (let t = 0; t < n; t++) {
      re += x[t] * Math.cos((-2 * Math.PI * k * t) / n);
      im += x[t] * Math.sin((-2 * Math.PI * k * t) / n);
    }
    expect(Math.abs(fft.re[k] - re) < 1e-3 && Math.abs(fft.im[k] - im) < 1e-3, `bin ${k}`).toBe(true);
  }
});

/** Synthetic track: 60 Hz kick every 0.5 s (120 BPM) over quiet hi-hat noise. */
function render(seconds: number, sr: number) {
  const out = new Float32Array(Math.floor(seconds * sr));
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const sinceKick = t % 0.5;
    const kick = sinceKick < 0.12 ? Math.sin(2 * Math.PI * 60 * sinceKick) * Math.exp(-sinceKick * 25) : 0;
    out[i] = 0.9 * kick + 0.02 * rnd();
  }
  return out;
}

test('AudioAnalyzer finds the beat and ~120 BPM like the engine', () => {
  const sr = 48000;
  const pcm = render(12, sr);
  const a = new AudioAnalyzer();
  const g = new ExperienceGraph();
  const hop = Math.round(sr / 60); // a 60 fps render loop
  let beats = 0;
  let last = a.latestSignals();
  for (let end = 1024; end <= pcm.length; end += hop) {
    last = a.update({ samples: pcm.subarray(end - 1024, end), sampleRate: sr, channelCount: 1, timestampSeconds: end / sr });
    g.update(last);
    if (last.beat) beats++;
    for (const v of [last.energy, last.bass, last.mid, last.treble]) expect(v >= 0 && v <= 1).toBe(true);
  }
  expect(beats >= 20 && beats <= 30, `beats=${beats}`).toBe(true);
  expect(Math.abs(last.bpm - 120) < 6, `bpm=${last.bpm}`).toBe(true);
  expect(last.spectrum.length).toBe(64);
  expect(last.waveform.length).toBe(128);
});

test('silence yields empty signals', () => {
  const a = new AudioAnalyzer();
  const s = a.update({ samples: new Float32Array(1024), sampleRate: 48000, channelCount: 1, timestampSeconds: 1 });
  expect(s.beat).toBe(false);
  expect(s.energy).toBe(0);
});
