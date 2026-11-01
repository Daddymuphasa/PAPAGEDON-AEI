// Mappings between the engine and the director. The engine speaks
// ExperienceSignals + ThemeDef; the director speaks AudioFeatures +
// ShowPlans. Nothing here touches WebGL, the DOM, or the network; the
// drop punch only uses a timer to schedule its own restore.
import type { ExperienceSignals } from '../lib/papagedon/analyzer';
import type { ExperienceGraphOutput } from '../lib/papagedon/experienceGraph';
import type { ThemeDef } from '../lib/papagedon/catalog';
import type { AudioFeatures, ThemeRoles } from '../types';

export interface EngineLive {
  intensity: number;
  speed: number;
  extra: [number, number, number];
}

// Structural subset of PapagedonRenderer the director writes to.
export interface EngineLiveTarget {
  preset: { saturationBase: number; saturationScale: number; energyMultiplier: number };
  master: { exposure: number };
  speed: number;
}

// Structural subset a drop punch writes to (both stage renderers).
export interface BeatPunchTarget {
  preset: { beatResponse: number; energyMultiplier: number };
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Engine frame -> director features. The engine has no sub-bass band or
// onset flag, so subBass follows bass and onset fires on beat edges.
export function engineSignalsToFeatures(
  s: ExperienceSignals,
  g: ExperienceGraphOutput,
  prev: { energy: number; beat: boolean } | null,
  nowMs: number,
): AudioFeatures {
  return {
    bpm: s.bpm,
    beat: s.beat,
    onset: s.beat && prev?.beat === false,
    bass: s.bass,
    mid: s.mid,
    high: s.treble,
    subBass: clamp(s.bass * 0.8, 0, 1),
    flux: prev === null ? 0 : Math.abs(s.energy - prev.energy),
    beatConfidence: s.confidence,
    energy: s.energy,
    buildUp: g.event === 'BuildUp',
    drop: g.event === 'Drop',
    timestamp: nowMs,
  };
}

// Director live values -> engine look. Extra drives look-only knobs
// (saturation, exposure). Intensity/speed rescale to multipliers around
// 1.0 so the director can only nudge audio reactivity, never mute it:
// neutral director state maps to exactly 1.0. PaletteEmphasis is
// intentionally unmapped (engine themes carry the palette story, so the
// field flows through for API compat only).
const LIVE_MULT_MIN = 0.85;
const LIVE_MULT_MAX = 1.3;
// ShowDirector steady-state intensity with no plan and no arc event
// (constructor + tweak base): the "director has no opinion" point.
const NEUTRAL_INTENSITY = 0.7;
export function applyLiveToEngine(live: EngineLive, t: EngineLiveTarget): void {
  t.preset.saturationBase = clamp(live.extra[0], 0, 0.5);
  t.preset.saturationScale = clamp(live.extra[1], 0, 1.5);
  t.master.exposure = clamp(live.extra[2], 0.2, 2);
  t.preset.energyMultiplier = clamp(live.intensity / NEUTRAL_INTENSITY, LIVE_MULT_MIN, LIVE_MULT_MAX);
  t.speed = clamp(live.speed, LIVE_MULT_MIN, LIVE_MULT_MAX);
}

// Plan transition -> stage action. flash-cut used to pop a white overlay;
// it now renders as a normal short crossfade while the drop punch below
// carries the impact inside the shader itself.
export type StageTransition = { kind: 'cut' } | { kind: 'xfade'; ms: number };
export function resolveStageTransition(t: { type: string; durationMs: number }): StageTransition {
  if (t.type === 'cut') return { kind: 'cut' };
  if (t.type === 'flash-cut') return { kind: 'xfade', ms: 250 };
  return { kind: 'xfade', ms: Math.max(60, t.durationMs) };
}

// Drop punch: a hit briefly turns up the shader's own beat response and
// energy swell, then restores whatever the director had set. Returns a
// cancel that also restores (a new hit cancels the previous punch, so
// the boost never stacks or gets stuck).
const DROP_PUNCH_MS = 300;
const DROP_PUNCH_BEAT = 2.2;
const DROP_PUNCH_ENERGY = 1.3;
export function punchBeatBoost(
  targets: BeatPunchTarget[],
  ms: number = DROP_PUNCH_MS,
): () => void {
  const prev = targets.map((t) => ({
    t,
    beat: t.preset.beatResponse,
    energy: t.preset.energyMultiplier,
  }));
  for (const t of targets) {
    t.preset.beatResponse = DROP_PUNCH_BEAT;
    t.preset.energyMultiplier = DROP_PUNCH_ENERGY;
  }
  let done = false;
  const id = setTimeout(restore, ms);
  function restore(): void {
    if (done) return;
    done = true;
    clearTimeout(id);
    for (const p of prev) {
      p.t.preset.beatResponse = p.beat;
      p.t.preset.energyMultiplier = p.energy;
    }
  }
  return restore;
}

// Flyer colour roles -> engine theme override.
export function rolesToThemeDef(name: string, roles: ThemeRoles): ThemeDef {
  return {
    id: 'flyer',
    name,
    palette: {
      primary: roles.primary,
      secondary: roles.secondary,
      accent: roles.accent,
      background: roles.background,
    },
    glow: 0.4,
    bloom: 0.45,
    motion: 1,
    noise: 0.05,
    distortion: 1.2,
    transitionSpeed: 5,
    file: '',
  };
}
