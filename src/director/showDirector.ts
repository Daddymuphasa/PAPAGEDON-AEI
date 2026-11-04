// M4 show director (control window): fast local layer every frame and on
// a 2s tick, plus the slow Muse Spark layer for big creative calls.
// The page drives frame() from rAF; all model calls are fire-and-forget
// async and the show never pauses for them.
import type {
  AudioEvent,
  AudioFeatures,
  AudioSummary,
  EnergyArc,
  EventTheme,
  ListeningProfile,
  ModelUsage,
  PlannerInput,
  ProfileSample,
  ShaderDefinition,
  ShaderMeta,
  ShowPlan,
  ShowTransition,
  TextureMeta,
  VisionPrompt,
  VisualParam,
  VisualizerInfo,
} from '../types';
import { EnergyBuffer, LONG_S, detectEvents, energyShifted, isBassSlam } from './energy';
import { PROFILE_WINDOW_S, computeProfile } from '../inputs/audio/profile';
import { rolesToDisplayPalette } from '../theme/roles';
import { withBasePath } from '../basePath';
import { logDecision } from './decisionLog';
import { isCapped, recordUsage } from './credit';
import {
  BREAKDOWN_PHRASE_BEATS,
  MANUAL_HOLD_S,
  MANUAL_SCENE_HOLD_S,
  MIN_SCENE_GAP_S,
  MAX_PLAN_RETRIES,
  PHRASE_BEATS,
  PLANNER_CADENCE_S,
  STALE_SCENE_S,
  isPhraseBoundary,
  mapThemeToOpening,
  shouldCallPlanner,
} from './showLogic';
import { verifyShowPlan } from './verifyShowPlan';
import { DEFAULT_TEX_MIX, pickTextureForPlan, pickTextureForTag } from './texturePick';
import { upcoming, upcomingList } from './trackMap';
import type { TrackMap, UpcomingChange } from '../types';

export const TWEAK_INTERVAL_S = 2;
// M5 map pre-cues: start holding intensity this far ahead of a mapped
// drop, scaling the local target by MAP_PREP_HOLD until the drop hits.
export const MAP_PRE_CUE_S = 2;
export const MAP_PREP_HOLD = 0.65;
export const MAP_PLANNER_SECTIONS = 3;
export const MAP_PLANNER_HORIZON_S = 60;
// Climax cuts: drops, 808 slams, and mapped drops landing within the
// guard share one scene cut instead of machine-gunning the stage.
export const CLIMAX_GUARD_S = 2;
// Builds re-queue the planner this often at most (anticipation calls).
export const BUILD_PLAN_GAP_S = 4;

export interface DirectorView {
  visualId: string;
  sceneName: string;
  reason: string;
  arc: EnergyArc;
  events: AudioEvent[];
  countdownS: number;
  meters: {
    bass: number;
    mid: number;
    high: number;
    energy: number;
    subBass: number;
    flux: number;
    beat: boolean;
    beatConfidence: number;
    bpm: number;
  };
  live: { intensity: number; speed: number; extra: [number, number, number] };
  manualHoldS: number;
  plannerBusy: boolean;
  themeName: string;
  profile: ListeningProfile | null;
  texture: { id: string | null; texMix: number };
  vision: VisionPrompt | null;
}

export type ShowSource = 'mic' | 'file' | 'mock';

export interface ShowSnapshot {
  visualId: string;
  extra: [number, number, number];
  intensity: number;
  speed: number;
  palette: string[];
  paletteEmphasis: number;
  sensitivity: number;
  blackout: boolean;
  source: ShowSource;
  bpm: number;
  t0: number;
  fileName: string | null;
}

// Single-window scene events: what the director used to post over the
// control -> output bus, now delivered straight to the page callback.
export type DirectorEvent =
  | {
      t: 'scene';
      visualId: string;
      extra: [number, number, number];
      intensity: number;
      speed: number;
      palette: string[];
      paletteEmphasis: number;
      transition: ShowTransition;
    }
  | { t: 'tweak'; intensity: number; speed: number; extra: [number, number, number]; paletteEmphasis: number; sensitivity: number }
  | { t: 'texture'; id: string | null; texMix: number }
  | { t: 'hit'; flash: number; boost: number }
  | { t: 'blackout'; on: boolean };

// Minimal visual shape the director needs (engine defs satisfy it).
export interface DirectorVisual {
  id: string;
  name: string;
  tags?: string[];
  params?: VisualParam[];
  meta?: ShaderMeta;
}

export interface ShowDirectorOpts {
  onScene: (e: DirectorEvent) => void;
  defs: DirectorVisual[];
  getTheme: () => EventTheme | null;
  manualHoldS?: number;
  onUpdate: (v: DirectorView) => void;
}

interface LiveState {
  visualId: string;
  extra: [number, number, number];
  intensity: number;
  speed: number;
  palette: string[];
  paletteEmphasis: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// M8: crowd motion nudges the energy model — a small extra input so a
// jumping crowd reads hotter without ever overriding the audio.
export const VISION_ENERGY_GAIN = 0.08;

export function withVisionGain(energy: number, motion: number): number {
  return clamp(energy + motion * VISION_ENERGY_GAIN, 0, 1);
}

// Climax-pick scoring mirrors the mock planner's criteria (keep the
// keyword lists in sync with BAND_WORDS in meta/mock.ts).
const CLIMAX_BAND_WORDS: Record<'bass' | 'mid' | 'high', string[]> = {
  bass: ['bass', 'kick', 'beat', 'pulse', 'drop', 'shockwave', 'pump', 'heave', 'sub', '808', 'boombox', 'portal', 'tunnel', 'seismic'],
  mid: ['mid', 'groove', 'ribbon', 'silk', 'velvet', 'flow', 'wave', 'liquid', 'tide', 'garden', 'mist'],
  high: ['treble', 'high', 'laser', 'crystal', 'prism', 'star', 'neon', 'sparkle', 'shimmer', 'lattice', 'candle', 'glass'],
};

function packOf(visualId: string): string {
  const i = visualId.indexOf('/');
  return i >= 0 ? visualId.slice(0, i) : visualId;
}

function parseUsage(res: Response): ModelUsage {
  try {
    const raw = res.headers.get('x-aei-usage');
    if (raw) return JSON.parse(raw) as ModelUsage;
  } catch {
    /* fall through */
  }
  return { calls: 1, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, latencyMs: 0, mock: false, status: 'unknown' };
}

export class ShowDirector {
  sensitivity = 1;
  private energy = new EnergyBuffer();
  private bassBuf = new EnergyBuffer();
  private midBuf = new EnergyBuffer();
  private highBuf = new EnergyBuffer();
  private live: LiveState;
  private plan: ShowPlan | null = null;
  private pending: ShowPlan | null = null;
  private lastPlans: ShowPlan[] = [];
  private arc: EnergyArc = 'sustain';
  private recentEvents: { e: AudioEvent; t: number }[] = [];
  private beatsSince = 0;
  private prevBeat = false;
  private lastClimaxAt = -1e9;
  private climaxCount = 0;
  private lastF: AudioFeatures | null = null;
  private wasBuild = false;
  private lastBuildT = -1e9;
  private lastTweak = 0;
  private lastPlannerCall: number | null = null;
  private lastCadence: number | null = null;
  private lastSceneAt = -1e9;
  // Scene dwell both cut paths honour (Normal pacing = MIN_SCENE_GAP_S).
  private dwellS = MIN_SCENE_GAP_S;
  // Last climax picks, so scored cuts never repeat a fresh look.
  private lastClimaxIds: string[] = [];
  private lastEaseT = 0;
  private plannerBusy = false;
  private capLogged = false;
  private manualUntil = 0;
  private lastManualLog = 0;
  private lastUpdate = 0;
  private lastReason = 'Opening scene';
  private blackout = false;
  private trackMap: TrackMap | null = null;
  private cuedDropAt: number | null = null;
  private prepDropAt: number | null = null;
  private textures: TextureMeta[] = [];
  private texId: string | null = null;
  private texMix = DEFAULT_TEX_MIX;
  private vision: VisionPrompt | null = null;
  private profSamples: ProfileSample[] = [];
  private profBpms: number[] = [];
  private profWindowStart: number | null = null;
  private profile: ListeningProfile | null = null;
  private audio: { source: ShowSource; bpm: number; t0: number; fileName: string | null } = {
    source: 'mock',
    bpm: 126,
    t0: 0,
    fileName: null,
  };

  constructor(private opts: ShowDirectorOpts) {
    const def = opts.defs[0];
    this.live = {
      visualId: def?.id ?? 'SignaturePack/01_aurora',
      extra: [
        def?.params?.[0]?.def ?? 0.5,
        def?.params?.[1]?.def ?? 0.5,
        def?.params?.[2]?.def ?? 0.5,
      ],
      intensity: 0.7,
      speed: 1,
      palette: rolesToDisplayPalette(
        opts.getTheme() ?? { palette: ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'] },
      ),
      paletteEmphasis: 0,
    };
  }

  setAudio(source: ShowSource, bpm: number, t0: number, fileName: string | null): void {
    this.audio = { source, bpm, t0, fileName };
    // A new clock re-arms map cues (no-op when no map is set).
    this.cuedDropAt = null;
    this.prepDropAt = null;
  }

  // M5: attach a verified track map (or clear it). Live analysis always
  // runs; the map only adds anticipation.
  setTrackMap(map: TrackMap | null): void {
    this.trackMap = map;
    this.cuedDropAt = null;
    this.prepDropAt = null;
  }

  // M7: attach the event-image set (metas only — no pixel bytes). Picks
  // the arc-matching texture immediately so the projector updates now.
  setEventImages(metas: TextureMeta[]): void {
    this.textures = [...metas];
    const pick = pickTextureForPlan(this.plan?.texture, this.plan?.texMix, this.textures, this.arc);
    this.applyTexture(pick.id, pick.texMix, 'images attached');
  }

  // M8: attach the latest smoothed vision read (or clear it). The page
  // owns the camera tick; the director only stores the signals.
  setVision(v: VisionPrompt | null): void {
    this.vision = v === null ? null : { ...v };
  }

  // M7 manual texture override: validated id (or null to clear) + mix.
  manualTexture(patch: { textureId?: string | null; texMix?: number }): void {
    const now = performance.now();
    this.manualUntil = now + (this.opts.manualHoldS ?? MANUAL_HOLD_S) * 1000;
    let id = this.texId;
    if (patch.textureId !== undefined) {
      const ok =
        patch.textureId === null ||
        this.textures.some((t) => t.enabled && t.id === patch.textureId);
      if (ok) id = patch.textureId;
    }
    const mix = patch.texMix === undefined ? this.texMix : clamp(patch.texMix, 0, 1);
    this.texId = id;
    this.texMix = mix;
    this.opts.onScene({ t: 'texture', id, texMix: mix });
    if (now - this.lastManualLog > 1000) {
      this.lastManualLog = now;
      logDecision({
        step: 'manual',
        model: 'local',
        input: 'texture override',
        result: id === null ? 'texture cleared' : `texture ${id} at mix ${mix.toFixed(2)}`,
        verify: null,
        retries: 0,
        latencyMs: null,
      });
    }
  }

  private applyTexture(id: string | null, mix: number, why: string): void {
    if (id === this.texId && Math.abs(mix - this.texMix) < 0.01) return;
    this.texId = id;
    this.texMix = mix;
    this.opts.onScene({ t: 'texture', id, texMix: mix });
    logDecision({
      step: 'local',
      model: 'local',
      input: `texture pick (${why})`,
      result: id === null ? 'no texture enabled' : `${id} at mix ${mix.toFixed(2)}`,
      verify: null,
      retries: 0,
      latencyMs: null,
    });
  }

  snapshot(): ShowSnapshot {
    return {
      visualId: this.live.visualId,
      extra: [...this.live.extra] as [number, number, number],
      intensity: this.live.intensity,
      speed: this.live.speed,
      palette: [...this.live.palette],
      paletteEmphasis: this.live.paletteEmphasis,
      sensitivity: this.sensitivity,
      blackout: this.blackout,
      source: this.audio.source,
      bpm: this.audio.bpm,
      t0: this.audio.t0,
      fileName: this.audio.fileName,
    };
  }

  // Theme -> show: primary-first roles palette, opening scene now.
  // BPM is handled by the page.
  opening(theme: EventTheme): void {
    const id = mapThemeToOpening(theme, this.opts.defs);
    const def = this.opts.defs.find((d) => d.id === id) ?? this.opts.defs[0];
    const pal = rolesToDisplayPalette(theme);
    this.live = {
      ...this.live,
      visualId: def.id,
      extra: [
        def.params?.[0]?.def ?? 0.5,
        def.params?.[1]?.def ?? 0.5,
        def.params?.[2]?.def ?? 0.5,
      ],
      palette: [...pal],
      paletteEmphasis: 0,
    };
    this.pending = null;
    this.beatsSince = 0;
    this.lastReason = `Opening scene for ${theme.eventName}`;
    this.lastSceneAt = performance.now() / 1000;
    this.opts.onScene({
      t: 'scene',
      visualId: def.id,
      extra: [...this.live.extra] as [number, number, number],
      intensity: this.live.intensity,
      speed: this.live.speed,
      palette: [...pal],
      paletteEmphasis: 0,
      transition: { type: 'crossfade', durationMs: 1500 },
    });
    logDecision({
      step: 'act',
      model: 'local',
      input: `theme "${theme.eventName}"`,
      result: `opening scene ${def.name}`,
      verify: null,
      retries: 0,
      latencyMs: null,
    });
  }

  // Manual override: applies now and holds the director. A picked scene
  // is the user driving, so it holds well past the dwell; a tweak holds
  // briefly as before.
  manual(patch: Partial<LiveState> & { visualId?: string }): void {
    const now = performance.now();
    const switched = patch.visualId !== undefined && patch.visualId !== this.live.visualId;
    const holdS = switched ? MANUAL_SCENE_HOLD_S : (this.opts.manualHoldS ?? MANUAL_HOLD_S);
    this.manualUntil = now + holdS * 1000;
    this.live = { ...this.live, ...patch };
    if (switched) {
      this.pending = null;
      this.beatsSince = 0;
      this.opts.onScene({
        t: 'scene',
        visualId: this.live.visualId,
        extra: [...this.live.extra] as [number, number, number],
        intensity: this.live.intensity,
        speed: this.live.speed,
        palette: [...this.live.palette],
        paletteEmphasis: this.live.paletteEmphasis,
        transition: { type: 'crossfade', durationMs: 1500 },
      });
    } else {
      this.opts.onScene({
        t: 'tweak',
        intensity: this.live.intensity,
        speed: this.live.speed,
        extra: [...this.live.extra] as [number, number, number],
        paletteEmphasis: this.live.paletteEmphasis,
        sensitivity: this.sensitivity,
      });
    }
    if (now - this.lastManualLog > 1000) {
      this.lastManualLog = now;
      logDecision({
        step: 'manual',
        model: 'local',
        input: 'control panel edit',
        result: switched ? `manual switch to ${this.live.visualId}` : 'manual tweak applied',
        verify: null,
        retries: 0,
        latencyMs: null,
      });
    }
  }

  noteCapReset(): void {
    this.capLogged = false;
  }

  setBlackout(on: boolean): void {
    this.blackout = on;
    this.opts.onScene({ t: 'blackout', on });
    logDecision({
      step: 'manual',
      model: 'local',
      input: 'blackout button',
      result: on ? 'output blacked out' : 'blackout released',
      verify: null,
      retries: 0,
      latencyMs: null,
    });
  }

  // Pacing control: how long a scene breathes before any cut path may
  // replace it (clamped so the stage can neither freeze nor strobe).
  setPacing(dwellS: number): void {
    this.dwellS = clamp(dwellS, 3, 20);
  }

  frame(f: AudioFeatures, nowMs: number): void {
    const now = nowMs / 1000;
    this.lastF = { ...f };
    this.energy.push(now, withVisionGain(f.energy, this.vision?.motion ?? 0));
    this.bassBuf.push(now, f.bass);
    this.midBuf.push(now, f.mid);
    this.highBuf.push(now, f.high);
    // Beat edges drive phrase counting only; the output flashes and
    // pulses off its own locally detected beats (M4.1, no per-beat bus).
    if (f.beat && !this.prevBeat) {
      this.beatsSince += 1;
    }
    this.prevBeat = f.beat;

    const events = detectEvents(this.energy, now, this.wasBuild);
    for (const e of events) this.onEvent(e, f, now);
    if (events.includes('build')) {
      this.wasBuild = true;
      this.lastBuildT = now;
    } else if (events.includes('drop') || now - this.lastBuildT > 10) {
      this.wasBuild = false;
    }
    // Heavy 808/kick slams cut the scene like a drop — big bass hits
    // land a new look even when overall energy doesn't jump.
    if (isBassSlam(this.bassBuf, now)) this.climax('808 slam', f, now);
    this.mapCues(nowMs);
    this.listenProfile(f, nowMs);

    const held = nowMs < this.manualUntil;
    const phraseLen = this.arc === 'breakdown' ? BREAKDOWN_PHRASE_BEATS : PHRASE_BEATS;
    if (this.pending && !held && isPhraseBoundary(this.beatsSince, phraseLen)) {
      this.executePending('phrase boundary', now);
    }
    // The look glides every frame (no visible 2s stepping); the texture
    // follow + log tick stays on the slow cadence.
    if (!held) this.ease(now);
    if (!held && now - this.lastTweak >= TWEAK_INTERVAL_S) {
      this.lastTweak = now;
      this.tickLook(f);
    }
    if (
      !held &&
      !this.plannerBusy &&
      shouldCallPlanner(now, this.lastPlannerCall, this.lastCadence, energyShifted(this.energy, now))
    ) {
      this.firePlanner();
    }
    if (nowMs - this.lastUpdate >= 100) {
      this.lastUpdate = nowMs;
      this.opts.onUpdate(this.view(f, now));
    }
  }

  private onEvent(e: AudioEvent, f: AudioFeatures, now: number): void {
    this.recentEvents = [...this.recentEvents, { e, t: now }].slice(-12);
    if (e === 'drop') {
      this.climax('drop', f, now);
    } else if (e === 'build') {
      this.arc = 'build';
      // Anticipation: queue the next scene DURING the build so a fresh
      // plan is already pending when the drop lands the cut.
      if (!this.plannerBusy && now - (this.lastPlannerCall ?? -1e9) > BUILD_PLAN_GAP_S) {
        this.firePlanner();
      }
      logDecision({
        step: 'local',
        model: 'local',
        input: 'build detected',
        result: 'riding the build up',
        verify: null,
        retries: 0,
        latencyMs: null,
      });
    } else {
      this.arc = 'breakdown';
      logDecision({
        step: 'local',
        model: 'local',
        input: 'breakdown detected',
        result: 'calm, slow, lower intensity',
        verify: null,
        retries: 0,
        latencyMs: null,
      });
    }
  }

  // Climax: a drop, 808 slam, or mapped drop always lands its punch
  // (flash + beat boost + drop artwork), but a scene cut has to be
  // earned: the dwell must have elapsed, the user must not be holding
  // the scene, and the moment must be musical — a waiting Muse plan, a
  // drop out of a build, an authoritative mapped drop, or a stale scene.
  // Anything less punches in place, so the stage never strobes on a timer.
  private climax(kind: 'drop' | '808 slam' | 'mapped drop', f: AudioFeatures, now: number): void {
    if (now - this.lastClimaxAt < CLIMAX_GUARD_S) return;
    this.lastClimaxAt = now;
    // Slams and mapped drops read as drops in the music context.
    if (kind !== 'drop') this.recentEvents = [...this.recentEvents, { e: 'drop' as AudioEvent, t: now }].slice(-12);
    this.arc = 'peak';
    this.opts.onScene({ t: 'hit', flash: Math.min(1, 0.5 + f.energy * 0.5), boost: 0.3 });
    // M7: climaxes punch straight to the drop-tagged artwork.
    const dropTex = pickTextureForTag('drop', this.textures);
    if (dropTex !== null) this.applyTexture(dropTex, this.texMix, `${kind} hit`);
    const held = now * 1000 < this.manualUntil;
    const sceneAge = now - this.lastSceneAt;
    const dwellOk = sceneAge >= this.dwellS;
    const stale = sceneAge >= STALE_SCENE_S;
    const builtUp = now - this.lastBuildT < 10;
    const waiting = this.pending !== null;
    const earned =
      kind === 'mapped drop' ? true : kind === 'drop' ? builtUp || stale : stale;
    if (!held && dwellOk && (waiting || earned)) {
      const next = this.pending ?? this.dropPick(f);
      this.pending = next;
      if (next !== null) {
        const fast: ShowTransition = { type: 'crossfade', durationMs: 250 };
        this.pending = { ...next, transition: fast };
        this.executePending('drop hit', now);
      }
      logDecision({
        step: next !== null ? 'act' : 'local',
        model: 'local',
        input: `${kind} detected`,
        result: next !== null ? this.lastReason : 'flash + intensity spike',
        verify: null,
        retries: 0,
        latencyMs: null,
      });
      return;
    }
    logDecision({
      step: 'local',
      model: 'local',
      input: `${kind} detected`,
      result: held ? 'held your pick — punch only' : 'inside the dwell — punch only',
      verify: null,
      retries: 0,
      latencyMs: null,
    });
  }

  // Scored climax pick for when no Muse plan waits: hot drop-range
  // scenes first, then the same criteria the planner scores (flyer
  // pick, energy fit, dominant-band fit, pack variety), never the live
  // scene or a fresh pick, rotating only through exact ties.
  // Tempo-matched speed so the cut moves with the track.
  private dropPick(f: AudioFeatures): ShowPlan | null {
    const defs = this.opts.defs;
    if (defs.length === 0) return null;
    const banned = new Set([this.live.visualId, ...this.lastPlans.map((p) => p.visualId), ...this.lastClimaxIds]);
    const fresh = defs.filter((d) => !banned.has(d.id));
    const pool = fresh.length > 0 ? fresh : defs.filter((d) => d.id !== this.live.visualId);
    const cands = pool.length > 0 ? pool : [...defs];
    const hot = cands.filter((d) => (d.meta?.energyRange[1] ?? 0) >= 0.9);
    const tops = hot.length > 0 ? hot : cands;
    const theme = this.opts.getTheme();
    const words = [theme?.genre ?? '', theme?.mood ?? '', ...(theme?.motifs ?? [])].join(' ').toLowerCase();
    const bands = { bass: f.bass, mid: f.mid, high: f.high } as const;
    const domBand = (Object.keys(bands) as Array<keyof typeof bands>).reduce((a, b) =>
      bands[a] >= bands[b] ? a : b,
    );
    const lastPacks = this.lastPlans.slice(-2).map((p) => packOf(p.visualId));
    const scored = tops.map((d) => {
      let s = 0;
      const why: string[] = [];
      if ((theme?.suggestedShaderIds ?? []).includes(d.id)) {
        s += 3;
        why.push('flyer pick');
      }
      const meta = d.meta;
      if (meta && f.energy >= meta.energyRange[0] && f.energy <= meta.energyRange[1]) {
        s += 2;
        why.push('energy match');
      }
      const hits = [...(meta?.themeTags ?? []), ...(meta?.moods ?? [])].filter(
        (tag) => tag && words.includes(tag.toLowerCase()),
      );
      if (hits.length > 0) {
        s += 2 * hits.length;
        why.push(`tags: ${hits.slice(0, 2).join(', ')}`);
      }
      const hay = `${d.id} ${d.name} ${[...(meta?.themeTags ?? []), ...(meta?.moods ?? [])].join(' ')}`.toLowerCase();
      if (CLIMAX_BAND_WORDS[domBand].some((w) => hay.includes(w))) {
        s += 2;
        why.push(`${domBand}-led`);
      }
      if ((meta?.energyRange[1] ?? 0) >= 0.9) {
        s += 1;
        why.push('drop-energy');
      }
      if (lastPacks.length === 2 && lastPacks[0] === lastPacks[1] && lastPacks[0] === packOf(d.id)) {
        s -= 2;
      }
      return { d, s, why };
    });
    const best = Math.max(...scored.map((c) => c.s));
    const winners = scored.filter((c) => c.s === best);
    const pick = winners[this.climaxCount % winners.length];
    const def = pick.d;
    this.climaxCount += 1;
    this.lastClimaxIds = [...this.lastClimaxIds, def.id].slice(-3);
    return {
      visualId: def.id,
      params: [def.params?.[0]?.def ?? 0.5, def.params?.[1]?.def ?? 0.5, def.params?.[2]?.def ?? 0.5],
      intensity: clamp(0.85 + f.energy * 0.15, 0, 1),
      speed: clamp(Math.round((f.bpm / 120) * 100) / 100 || 1, 0.6, 2),
      paletteEmphasis: this.live.paletteEmphasis,
      transition: { type: 'crossfade', durationMs: 250 },
      energyArc: 'peak',
      sectionSeconds: 15,
      reason: `Drop cut to ${def.name} at ${Math.round(f.bpm)} bpm — ${pick.why.join('; ') || 'rotation'}`,
    };
  }

  // Events younger than the planner's 20s summary window — a stale drop
  // must not pollute the music context or the Auto show readout.
  private liveEvents(now: number): AudioEvent[] {
    return [...new Set(this.recentEvents.filter((s) => now - s.t <= LONG_S).map((s) => s.e))];
  }

  // M5 map cues: ~2s before a mapped drop, arm a prep hold (the local
  // layer eases intensity down); on the drop boundary, release and log
  // the hit. Silent without a map, on mic, or past the map end.
  private mapCues(nowMs: number): void {
    const map = this.trackMap;
    if (!map || this.audio.source === 'mic') return;
    const t = (nowMs - this.audio.t0) / 1000;
    if (t < 0 || t > map.durationS) {
      this.prepDropAt = null;
      return;
    }
    const next = upcoming(map.sections, t, MAP_PRE_CUE_S);
    if (next && next.to === 'drop' && this.cuedDropAt !== next.at) {
      this.cuedDropAt = next.at;
      this.prepDropAt = next.at;
      logDecision({
        step: 'map',
        model: 'local',
        input: `mapped drop in ${next.inS.toFixed(1)}s`,
        result: 'pre-cue: holding intensity back',
        verify: null,
        retries: 0,
        latencyMs: null,
      });
    }
    if (this.prepDropAt !== null && t >= this.prepDropAt) {
      this.prepDropAt = null;
      logDecision({
        step: 'map',
        model: 'local',
        input: `mapped drop at ${t.toFixed(1)}s`,
        result: 'map hit: released on the drop',
        verify: null,
        retries: 0,
        latencyMs: null,
      });
      // A mapped climax cuts the scene like an audio drop (guarded
      // against double-cutting when the audio drop lands with it).
      if (this.lastF) this.climax('mapped drop', this.lastF, nowMs / 1000);
    }
  }

  // M6 listening profile: accumulate frames, recompute every ~4s,
  // log label changes as "listen". Pure local DSP, works in mock too.
  private listenProfile(f: AudioFeatures, nowMs: number): void {
    if (this.profWindowStart === null) this.profWindowStart = nowMs;
    this.profSamples.push({ subBass: f.subBass, bass: f.bass, mid: f.mid, high: f.high, energy: f.energy });
    this.profBpms.push(f.bpm);
    if (this.profSamples.length > 600) {
      this.profSamples.shift();
      this.profBpms.shift();
    }
    if (nowMs - this.profWindowStart < PROFILE_WINDOW_S * 1000) return;
    const prev = this.profile?.label ?? null;
    const next = computeProfile(this.profSamples, this.profBpms);
    this.profile = next;
    this.profSamples = [];
    this.profBpms = [];
    this.profWindowStart = nowMs;
    if (next.label !== prev) {
      logDecision({
        step: 'listen',
        model: 'local',
        input: `room read ${next.bpm} bpm`,
        result: `${prev ?? '—'} → ${next.label} (${Math.round(next.confidence * 100)}%)`,
        verify: null,
        retries: 0,
        latencyMs: null,
      });
    }
  }

  // Continuous glide toward the plan target, called every frame. Same
  // destinations the old 2s stepped tweak had, but time-based so the
  // look never visibly steps on a timer.
  private ease(now: number): void {
    const target = this.plan;
    const baseI = target?.intensity ?? 0.7;
    const baseS = target?.speed ?? 1;
    const hold = this.prepDropAt !== null ? MAP_PREP_HOLD : 1;
    const wantI =
      (this.arc === 'breakdown' ? Math.min(baseI, 0.4) : clamp(baseI + (this.arc === 'peak' ? 0.1 : 0), 0, 1)) *
      hold;
    const wantS = this.arc === 'breakdown' ? Math.min(baseS, 0.6) : baseS;
    const dt = this.lastEaseT > 0 ? Math.max(0, now - this.lastEaseT) : 1 / 60;
    this.lastEaseT = now;
    const k = 1 - Math.exp(-dt * 1.2);
    const wantE = (target?.params ?? this.live.extra).map((v, i) => this.live.extra[i] + (v - this.live.extra[i]) * k) as [
      number,
      number,
      number,
    ];
    this.live = {
      ...this.live,
      intensity: this.live.intensity + (wantI - this.live.intensity) * k,
      speed: this.live.speed + (wantS - this.live.speed) * k,
      extra: wantE,
      paletteEmphasis: target?.paletteEmphasis ?? this.live.paletteEmphasis,
    };
    this.opts.onScene({
      t: 'tweak',
      intensity: this.live.intensity,
      speed: this.live.speed,
      extra: [...this.live.extra] as [number, number, number],
      paletteEmphasis: this.live.paletteEmphasis,
      sensitivity: this.sensitivity,
    });
  }

  // Slow look tick: texture follows the arc between plans (posts only
  // on change) plus the easing log line.
  private tickLook(f: AudioFeatures): void {
    const follow = pickTextureForPlan(this.plan?.texture, this.plan?.texMix, this.textures, this.arc);
    this.applyTexture(follow.id, follow.texMix, `arc ${this.arc}`);
    logDecision({
      step: 'local',
      model: 'local',
      input: `${this.arc} at energy ${f.energy.toFixed(2)}`,
      result: `eased to I ${this.live.intensity.toFixed(2)} / S ${this.live.speed.toFixed(2)}`,
      verify: null,
      retries: 0,
      latencyMs: null,
    });
  }

  private executePending(why: string, now: number): void {
    // A scene needs room to breathe: earned drop hits cut (the climax
    // gate already checked the dwell), anything else waits out the
    // pacing dwell (the pending plan survives for the next window).
    // Stamped on frame time so rAF and test clocks agree.
    if (why !== 'drop hit' && now - this.lastSceneAt < this.dwellS) return;
    this.lastSceneAt = now;
    const plan = this.pending;
    if (!plan) return;
    this.pending = null;
    this.beatsSince = 0;
    this.plan = plan;
    this.lastReason = plan.reason;
    this.live = {
      ...this.live,
      visualId: plan.visualId,
      intensity: plan.intensity,
      speed: plan.speed,
      paletteEmphasis: plan.paletteEmphasis,
    };
    this.opts.onScene({
      t: 'scene',
      visualId: plan.visualId,
      extra: [...plan.params],
      intensity: plan.intensity,
      speed: plan.speed,
      palette: [...this.live.palette],
      paletteEmphasis: plan.paletteEmphasis,
      transition: plan.transition,
    });
    // M7: plan-named texture wins, else the section's energy tag.
    const pick = pickTextureForPlan(plan.texture, plan.texMix, this.textures, this.arc);
    this.applyTexture(pick.id, pick.texMix, `plan ${plan.visualId}`);
    logDecision({
      step: 'act',
      model: 'local',
      input: `${plan.visualId} via ${plan.transition.type} (${why})`,
      result: plan.reason,
      verify: null,
      retries: 0,
      latencyMs: null,
    });
  }

  private defInfos(): VisualizerInfo[] {
    return this.opts.defs.map((d) => ({
      id: d.id,
      name: d.name,
      tags: d.tags ?? [],
      params: d.params ?? [],
      ...(d.meta ? { meta: d.meta } : {}),
    }));
  }

  // M5: next mapped section changes for the Muse Spark prompt, or
  // undefined (omitted from the prompt JSON) when no map applies.
  private plannerSections(pageNowS: number): UpcomingChange[] | undefined {
    const map = this.trackMap;
    if (!map || this.audio.source === 'mic') return undefined;
    return upcomingList(map.sections, pageNowS - this.audio.t0 / 1000, MAP_PLANNER_SECTIONS, MAP_PLANNER_HORIZON_S);
  }

  private summary(): AudioSummary {
    const now = performance.now() / 1000;
    return {
      avgEnergy: this.energy.avg(20, now),
      peakEnergy: this.energy.peak(20, now),
      avgBass: this.bassBuf.avg(20, now),
      avgMid: this.midBuf.avg(20, now),
      avgHigh: this.highBuf.avg(20, now),
      events: this.liveEvents(now),
      bpm: this.audio.bpm,
      seconds: 20,
    };
  }

  private firePlanner(): void {
    if (isCapped()) {
      if (!this.capLogged) {
        this.capLogged = true;
        logDecision({
          step: 'cap',
          model: 'local',
          input: 'planner trigger',
          result: 'cap reached, local only',
          verify: null,
          retries: 0,
          latencyMs: null,
        });
      }
      return;
    }
    this.plannerBusy = true;
    const now = performance.now() / 1000;
    this.lastPlannerCall = now;
    this.lastCadence = now;
    const input: PlannerInput = {
      theme: this.opts.getTheme(),
      summary: this.summary(),
      current: {
        visualId: this.live.visualId,
        params: [...this.live.extra] as [number, number, number],
        intensity: this.live.intensity,
        speed: this.live.speed,
        paletteEmphasis: this.live.paletteEmphasis,
      },
      lastPlans: this.lastPlans.slice(-3),
      visualizers: this.defInfos(),
      upcomingSections: this.plannerSections(now),
      profile: this.profile ?? undefined,
      textures: this.textures.length > 0 ? [...this.textures] : undefined,
      vision: this.vision ?? undefined,
    };
    const history = [...this.lastPlans.map((p) => p.visualId), this.live.visualId].slice(-2);
    let feedback: { previous: ShowPlan; errors: string[] } | undefined;
    let attempt = 0;
    const round = async (): Promise<void> => {
      const t0 = performance.now();
      try {
        const res = await fetch(withBasePath('/api/show/plan'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, feedback }),
        });
        const model = res.headers.get('x-aei-model') ?? '?';
        recordUsage(parseUsage(res));
        if (!res.ok) throw new Error(`planner failed: ${res.status}`);
        const candidate = (await res.json()) as ShowPlan;
        const knownTex = this.textures.filter((t) => t.enabled).map((t) => t.id);
        const check = verifyShowPlan(candidate, this.defInfos(), history, knownTex);
        logDecision({
          step: 'verify',
          model,
          input: `plan for ${String((candidate as Partial<ShowPlan>).visualId)}`,
          result: check.ok ? 'PASS' : 'FAIL',
          verify: { pass: check.ok, reason: check.ok ? 'all checks passed' : check.errors[0] },
          retries: attempt,
          latencyMs: Math.round(performance.now() - t0),
        });
        if (check.ok) {
          this.lastPlans = [...this.lastPlans, candidate].slice(-3);
          this.pending = candidate;
          logDecision({
            step: 'plan',
            model,
            input: `20s summary, energy ${input.summary.avgEnergy.toFixed(2)}`,
            result: candidate.reason,
            verify: null,
            retries: attempt,
            latencyMs: Math.round(performance.now() - t0),
          });
          this.plannerBusy = false;
          return;
        }
        feedback = { previous: candidate, errors: check.errors };
      } catch (err) {
        feedback = feedback ?? undefined;
        logDecision({
          step: 'verify',
          model: '?',
          input: 'planner call',
          result: 'error',
          verify: { pass: false, reason: err instanceof Error ? err.message : String(err) },
          retries: attempt,
          latencyMs: Math.round(performance.now() - t0),
        });
      }
      attempt += 1;
      if (attempt > MAX_PLAN_RETRIES) {
        logDecision({
          step: 'act',
          model: 'local',
          input: 'planner gave up',
          result: `keeping last good plan (${feedback?.errors[0] ?? 'call failed'})`,
          verify: { pass: false, reason: 'retries exhausted' },
          retries: attempt,
          latencyMs: null,
        });
        this.plannerBusy = false;
        return;
      }
      void round();
    };
    void round();
  }

  private view(f: AudioFeatures, now: number): DirectorView {
    const def = this.opts.defs.find((d) => d.id === this.live.visualId);
    const countdown =
      this.lastCadence === null ? 0 : Math.max(0, Math.ceil(PLANNER_CADENCE_S - (now - this.lastCadence)));
    return {
      visualId: this.live.visualId,
      sceneName: def?.name ?? this.live.visualId,
      reason: this.lastReason,
      arc: this.arc,
      events: this.liveEvents(now),
      countdownS: countdown,
      meters: {
        bass: f.bass,
        mid: f.mid,
        high: f.high,
        energy: f.energy,
        subBass: f.subBass,
        flux: f.flux,
        beat: f.beat,
        beatConfidence: f.beatConfidence,
        bpm: f.bpm,
      },
      live: {
        intensity: this.live.intensity,
        speed: this.live.speed,
        extra: [...this.live.extra] as [number, number, number],
      },
      manualHoldS: Math.max(0, (this.manualUntil - now * 1000) / 1000),
      plannerBusy: this.plannerBusy,
      themeName: this.opts.getTheme()?.eventName ?? '—',
      profile: this.profile,
      texture: { id: this.texId, texMix: this.texMix },
      vision: this.vision,
    };
  }
}
