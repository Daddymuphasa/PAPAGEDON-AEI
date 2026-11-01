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
    'lagos-night-drive',
    'hex-core',
    'bass-portal',
    'particle-galaxy',
    'ember-field',
    'ankara-kaleido',
    'strobe-lattice',
    'neon-tunnel-3d',
  ],
};

const MOCK_ARCS: EnergyArc[] = ['build', 'peak', 'sustain', 'breakdown', 'release'];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Deterministic varied mock ShowPlan: never the current scene or the last
// plan, prefers theme/energy metadata matches, rotates between equal
// scores, reacts to summary events, sweeps params inside declared ranges.
export function mockShowPlan(input: PlannerInput, cursor: number): ShowPlan {
  const ids = input.visualizers.length > 0 ? input.visualizers : [{ id: 'hex-core', params: [] }];
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
  const score = (v: (typeof ids)[number]): number => {
    let s = 0;
    if ((input.theme?.suggestedShaderIds ?? []).includes(v.id)) s += 3;
    const meta = (v as VisualizerInfo).meta;
    if (!meta) return s;
    if (energy >= meta.energyRange[0] && energy <= meta.energyRange[1]) s += 1;
    for (const tag of [...meta.themeTags, ...meta.moods]) {
      if (tag && words.includes(tag.toLowerCase())) s += 2;
    }
    return s;
  };
  const best = Math.max(...pool.map(score));
  const tops = pool.filter((v) => score(v) === best);
  const visualId = tops[cursor % tops.length].id;
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
  const transition = { type: 'crossfade' as const, durationMs: 1500 };
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
