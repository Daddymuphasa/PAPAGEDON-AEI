// M6 listening profile: a small local read of the room from a ~4s window
// of features — bpm range, bass-heaviness, brightness, dynamics — plus a
// best-guess dancefloor label with confidence. Pure local DSP, no model
// calls. All math written fresh for this repo.
import type { ListeningLabel, ListeningProfile, ProfileSample } from '../../types';

export const PROFILE_WINDOW_S = 4;
export const PROFILE_MIN_SAMPLES = 8;
export const PROFILE_MIXED_BELOW = 0.35;

function mean(a: number[]): number {
  return a.length === 0 ? 0 : a.reduce((x, y) => x + y, 0) / a.length;
}

function median(a: number[]): number {
  if (a.length === 0) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}

// 1 inside [lo, hi], linear falloff to 0 over `feather` bpm outside.
function bandScore(bpm: number, lo: number, hi: number, feather = 8): number {
  if (bpm <= 0) return 0;
  if (bpm >= lo && bpm <= hi) return 1;
  if (bpm < lo) return Math.max(0, 1 - (lo - bpm) / feather);
  return Math.max(0, 1 - (bpm - hi) / feather);
}

export function computeProfile(samples: ProfileSample[], bpms: number[]): ListeningProfile {
  const heard = bpms.filter((b) => b > 0);
  const bpm = heard.length === 0 ? 0 : median(heard);
  const bpmRange: [number, number] =
    heard.length === 0 ? [0, 0] : [Math.min(...heard), Math.max(...heard)];
  if (samples.length < PROFILE_MIN_SAMPLES) {
    return {
      bpm, bpmRange, bassHeaviness: 0, brightness: 0, dynamics: 0,
      label: 'mixed', confidence: 0,
    };
  }
  const totals = samples.map((s) => s.subBass + s.bass + s.mid + s.high);
  const bassHeaviness = mean(samples.map((s, i) => (s.subBass + s.bass) / Math.max(1e-6, totals[i])));
  const brightness = mean(samples.map((s, i) => s.high / Math.max(1e-6, totals[i])));
  const subRatio = mean(samples.map((s) => s.subBass / Math.max(1e-6, s.subBass + s.bass)));
  const energies = samples.map((s) => s.energy);
  const eMean = mean(energies);
  const eVar = mean(energies.map((e) => (e - eMean) * (e - eMean)));
  const dynamics = Math.min(1, Math.sqrt(eVar) / Math.max(1e-6, eMean));
  const lowEnergy = 1 - Math.min(1, eMean * 2);

  const scores: Array<{ label: ListeningLabel; score: number }> = [
    {
      label: 'house/techno',
      score:
        0.55 * bandScore(bpm, 118, 136) +
        0.25 * bassHeaviness +
        0.2 * Math.max(0, 1 - Math.abs(dynamics - 0.45) * 2),
    },
    {
      label: 'afrobeats/amapiano-ish',
      score:
        0.5 * bandScore(bpm, 95, 116) +
        0.2 * bassHeaviness +
        0.15 * brightness +
        0.15 * dynamics,
    },
    {
      label: 'hip-hop',
      score: 0.5 * bandScore(bpm, 70, 95) + 0.25 * subRatio + 0.25 * dynamics,
    },
    {
      label: 'ambient',
      score:
        0.4 * (1 - dynamics) +
        0.25 * (1 - bassHeaviness) +
        0.2 * (bpm === 0 ? 1 : 0) +
        0.15 * lowEnergy,
    },
  ];
  const ranked = [...scores].sort((a, b) => b.score - a.score);
  const [top, runner] = ranked;
  if (top.score < PROFILE_MIXED_BELOW) {
    return {
      bpm, bpmRange,
      bassHeaviness: round4(bassHeaviness),
      brightness: round4(brightness),
      dynamics: round4(dynamics),
      label: 'mixed',
      confidence: round4(top.score),
    };
  }
  return {
    bpm, bpmRange,
    bassHeaviness: round4(bassHeaviness),
    brightness: round4(brightness),
    dynamics: round4(dynamics),
    label: top.label,
    confidence: round4(Math.min(1, Math.max(0, 0.5 + (top.score - runner.score) / 2))),
  };
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
