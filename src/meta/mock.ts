// Shared mock payloads (MOCK mode). Client-safe: no keys, no fetches.
import type {
  CrowdSignal,
  DirectorInput,
  EnergyArc,
  EventTheme,
  MusicInsight,
  PlannerInput,
  ScenePlan,
  ShowPlan,
} from '../types';
import { pickTextureForPlan } from '../director/texturePick';

export const mockTheme: EventTheme = {
  eventName: 'Lagos Neon Nights',
  genre: 'Afrobeats',
  mood: 'electric',
  palette: ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'],
  energy: 0.85,
  motifs: ['neon', 'waves', 'silhouettes'],
  typographyFeel: 'bold condensed glow',
  tempoBpm: { min: 95, max: 125 },
  sceneSwitchSeconds: { min: 4, max: 12 },
  suggestedShaderIds: ['example-bass-pulse'],
};

export const mockInsight: MusicInsight = {
  genre: 'Afrobeats',
  section: 'build',
  mood: 'electric',
  lyrics: '',
  keywords: ['lagos', 'tonight', 'dance'],
  timestamp: Date.now(),
};

export const mockCrowdSignal: CrowdSignal = { density: 0.6, movement: 0.5, timestamp: Date.now() };

export function mockPlan(input?: Partial<DirectorInput>): ScenePlan {
  return {
    shaderId: 'example-bass-pulse',
    palette: input?.theme?.palette ?? mockTheme.palette,
    intensity: 0.7,
    textureUrl: null,
    transition: { type: 'fade', durationMs: 600 },
    lyricWords: [],
  };
}

const MOCK_ARCS: EnergyArc[] = ['build', 'peak', 'sustain', 'breakdown', 'release'];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Deterministic varied mock ShowPlan: rotates visuals without repeating,
// reacts to summary events, sweeps params inside declared ranges.
export function mockShowPlan(input: PlannerInput, cursor: number): ShowPlan {
  const ids = input.visualizers.length > 0 ? input.visualizers : [{ id: 'hex-core', params: [] }];
  const recent = input.lastPlans.map((p) => p.visualId);
  const pick = ids.map((v) => v.id).find((id) => {
    const tail = [...recent.slice(-2), id];
    return !(tail.length === 3 && tail[0] === id && tail[1] === id);
  });
  const visualId = pick ?? ids[cursor % ids.length].id;
  const def = input.visualizers.find((v) => v.id === visualId);
  const events = input.summary.events;
  let arc: EnergyArc = MOCK_ARCS[cursor % MOCK_ARCS.length];
  if (events.includes('drop')) arc = 'peak';
  else if (events.includes('breakdown')) arc = 'breakdown';
  else if (events.includes('build')) arc = 'build';
  const wobble = (i: number) => Math.sin(cursor * 1.7 + i * 2.1) * 0.25;
  const params: [number, number, number] = [0, 1, 2].map((i) => {
    const range = def?.params[i];
    if (!range) return 0.5;
    const mid = (range.min + range.max) / 2;
    return clamp(mid + ((range.max - range.min) / 2) * wobble(i), range.min, range.max);
  }) as [number, number, number];
  const transition =
    arc === 'peak'
      ? { type: 'flash-cut' as const, durationMs: 150 }
      : cursor % 3 === 2
        ? { type: 'cut' as const, durationMs: 0 }
        : { type: 'crossfade' as const, durationMs: 600 };
  const genre = input.theme?.genre ?? 'the mix';
  const mood = input.theme?.mood ?? 'electric';
  // M7: mock names a texture by energy tag when images exist, else null.
  const tex = pickTextureForPlan(undefined, undefined, input.textures ?? [], arc);
  return {
    visualId,
    params,
    intensity: clamp(0.45 + input.summary.avgEnergy * 0.5 + (arc === 'peak' ? 0.15 : 0), 0, 1),
    speed: clamp(0.8 + (cursor % 5) * 0.1 + (arc === 'breakdown' ? -0.3 : 0), 0, 2),
    paletteEmphasis: cursor % 4,
    transition,
    energyArc: arc,
    sectionSeconds: [20, 30, 40][cursor % 3],
    reason: `Mock ${arc} scene on ${visualId} for ${mood} ${genre}`,
    texture: tex.id,
    texMix: tex.texMix,
  };
}
