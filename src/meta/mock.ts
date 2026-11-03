// Shared mock payloads (MOCK mode). Client-safe: no keys, no fetches.
import type { EnergyArc, EventTheme, PlannerInput, ShowPlan, VisualizerInfo } from '../types';
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
  suggestedShaderIds: [
    'SignaturePack/01_aurora',
    'BadmanExperiencePack/18_bass_portals',
    'PulsePack/01_kick_pump',
    'TranceExperiencePack/20_trance_ascension',
    'FestivalPack/03_festival_eq',
    'HypnoticPack/05_hypno_spiral',
    'SignaturePack/11_bass_shockwave',
    'BadmanExperiencePack/12_final_ascension',
  ],
};

const MOCK_ARCS: EnergyArc[] = ['build', 'peak', 'sustain', 'breakdown', 'release'];

// Band-affinity keywords: the dominant summary band should match the scene.
const BAND_WORDS: Record<'bass' | 'mid' | 'high', string[]> = {
  bass: ['bass', 'kick', 'beat', 'pulse', 'drop', 'shockwave', 'pump', 'heave', 'sub', '808', 'boombox', 'portal', 'tunnel', 'seismic'],
  mid: ['mid', 'groove', 'ribbon', 'silk', 'velvet', 'flow', 'wave', 'liquid', 'tide', 'garden', 'mist'],
  high: ['treble', 'high', 'laser', 'crystal', 'prism', 'star', 'neon', 'sparkle', 'shimmer', 'lattice', 'candle', 'glass'],
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function packOf(visualId: string): string {
  const i = visualId.indexOf('/');
  return i >= 0 ? visualId.slice(0, i) : visualId;
}

// Deterministic varied mock ShowPlan: never the current scene or the last
// plan, prefers theme/energy metadata matches, rotates between equal
// scores, reacts to summary events, sweeps params inside declared ranges.
export function mockShowPlan(input: PlannerInput, cursor: number): ShowPlan {
  const ids = input.visualizers.length > 0 ? input.visualizers : [{ id: 'SignaturePack/01_aurora', params: [] }];
  const banned = new Set(
    [input.current.visualId, ...input.lastPlans.map((p) => p.visualId)].filter(Boolean),
  );
  let pool = ids.filter((v) => !banned.has(v.id));
  if (pool.length === 0) pool = [...ids]; // single-visualizer fallback
  const words = [
    input.theme?.genre ?? '',
    input.theme?.mood ?? '',
    ...(input.theme?.motifs ?? []),
    ...(input.theme?.suggestedShaderIds ?? []),
  ]
    .join(' ')
    .toLowerCase();
  const energy = input.summary.avgEnergy;
  const events = input.summary.events;
  const bandLevels = { bass: input.summary.avgBass, mid: input.summary.avgMid, high: input.summary.avgHigh };
  const domBand = (Object.keys(bandLevels) as Array<keyof typeof bandLevels>).reduce((a, b) =>
    bandLevels[a] >= bandLevels[b] ? a : b,
  );
  const dropEnergy =
    (events.includes('drop') || events.includes('build')) &&
    input.summary.peakEnergy - energy > 0.25;
  const lastPacks = input.lastPlans.slice(-2).map((p) => packOf(p.visualId));
  // Criteria, in fixed order: flyer pick, energy fit, tag/mood hits, band
  // fit, drop-energy, variety guard. The winner's matches land in reason.
  const score = (v: (typeof ids)[number]): { total: number; why: string[] } => {
    let s = 0;
    const why: string[] = [];
    if ((input.theme?.suggestedShaderIds ?? []).includes(v.id)) {
      s += 3;
      why.push('flyer pick');
    }
    if (lastPacks.length === 2 && lastPacks[0] === lastPacks[1] && lastPacks[0] === packOf(v.id)) {
      s -= 2;
    }
    const meta = (v as VisualizerInfo).meta;
    if (!meta) return { total: s, why };
    if (energy >= meta.energyRange[0] && energy <= meta.energyRange[1]) {
      s += 1;
      why.push('energy match');
    }
    const hits = [...meta.themeTags, ...meta.moods].filter(
      (tag) => tag && words.includes(tag.toLowerCase()),
    );
    if (hits.length > 0) {
      s += 2 * hits.length;
      why.push(`tags: ${hits.slice(0, 2).join(', ')}`);
    }
    const hay = `${v.id} ${[...meta.themeTags, ...meta.moods].join(' ')}`.toLowerCase();
    if (BAND_WORDS[domBand].some((w) => hay.includes(w))) {
      s += 2;
      why.push(`${domBand}-led`);
    }
    if (dropEnergy && meta.energyRange[1] >= 0.9) {
      s += 2;
      why.push('drop-energy');
    }
    return { total: s, why };
  };
  const scored = pool.map((v) => ({ v, ...score(v) }));
  const best = Math.max(...scored.map((x) => x.total));
  const tops = scored.filter((x) => x.total === best);
  const winner = tops[cursor % tops.length];
  const visualId = winner.v.id;
  const def = input.visualizers.find((v) => v.id === visualId);
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
  const transition = { type: 'crossfade' as const, durationMs: 1500 };
  const genre = input.theme?.genre ?? 'the mix';
  const mood = input.theme?.mood ?? 'electric';
  const bpm = input.summary.bpm;
  const speed =
    bpm > 0 ? clamp(bpm / 120, 0.5, 2) : clamp(0.8 + (cursor % 5) * 0.1 + (arc === 'breakdown' ? -0.3 : 0), 0, 2);
  const sections = energy >= 0.75 ? [12, 16, 20] : energy <= 0.35 ? [30, 40, 50] : [20, 30, 40];
  // M7: mock names a texture by energy tag when images exist, else null.
  const tex = pickTextureForPlan(undefined, undefined, input.textures ?? [], arc);
  return {
    visualId,
    params,
    intensity: clamp(0.45 + input.summary.avgEnergy * 0.5 + (arc === 'peak' ? 0.15 : 0), 0, 1),
    speed,
    paletteEmphasis: cursor % 4,
    transition,
    energyArc: arc,
    sectionSeconds: sections[cursor % 3],
    reason: `Mock ${arc} scene on ${visualId} for ${mood} ${genre} — ${winner.why.join('; ') || 'rotation'}`,
    texture: tex.id,
    texMix: tex.texMix,
  };
}
