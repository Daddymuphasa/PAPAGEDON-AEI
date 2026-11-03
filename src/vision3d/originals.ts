// ── Originals registry ──────────────────────────────────────────────────────
// The nine original PAPAGEDON visualizers, ported from PORTFOLIO- origin/main
// (lib/vision/visualizers/*, the live papagedon.com/app Vision mode).
// Import-safe by design: plain data only, so client pages and vitest share it.
// Fixed palettes: these scenes take NO theme/color input (per the approved
// replication plan) — geometry, motion and audio response are ported 1:1,
// color reactivity is out of scope.
import type { PackDef, ShaderDef } from '../lib/papagedon/catalog';
import type { DirectorVisual } from '../director/showDirector';
import { ENGINE_PARAMS } from '../director/engineDefs';

export type OriginalKind = 'surface' | 'sculptural';

export interface OriginalEntry {
  /** Stage id, e.g. 'Originals/nano-hex'. */
  id: string;
  /** Variant id inside the nano-hex engine (pack id / scene mode key). */
  variantId: string;
  name: string;
  kind: OriginalKind;
  /** Calm -> peak order, from /app AUTO_POOL with the immersive scenes out. */
  order: number;
  themeTags: string[];
  energyRange: [number, number];
  moods: string[];
}

function o(
  variantId: string,
  name: string,
  kind: OriginalKind,
  order: number,
  themeTags: string[],
  energyRange: [number, number],
  moods: string[],
): OriginalEntry {
  return { id: `Originals/${variantId}`, variantId, name, kind, order, themeTags, energyRange, moods };
}

export const ORIGINALS: OriginalEntry[] = [
  o('liquid-mirror', 'Liquid Mirror', 'sculptural', 0, ['original', 'liquid', 'vision', 'three'], [0, 0.45], ['flowing', 'liquid', 'calm']),
  o('wave-tunnel', 'Wave Tunnel', 'sculptural', 1, ['original', 'tunnel', 'vision', 'three'], [0, 0.45], ['drifting', 'deep', 'calm']),
  o('obsidian-bloom', 'Obsidian Bloom', 'surface', 2, ['original', 'hex', 'vision', 'three'], [0.25, 0.75], ['unfolding', 'dark', 'elegant']),
  o('nano-hex', 'Nano Hex Genesis', 'surface', 3, ['original', 'hex', 'vision', 'three'], [0.25, 0.75], ['monumental', 'mechanical', 'driving']),
  o('armor-scales', 'Armor Scales', 'surface', 4, ['original', 'hex', 'vision', 'three'], [0.25, 0.75], ['armored', 'faceted', 'driving']),
  o('prism-shards', 'Prism Shards', 'surface', 5, ['original', 'hex', 'vision', 'three'], [0.5, 1], ['crystalline', 'sharp', 'bright']),
  o('circuit-matrix', 'Circuit Matrix', 'surface', 6, ['original', 'hex', 'vision', 'three'], [0.5, 1], ['digital', 'coded', 'driving']),
  o('gilded-reactor', 'Gilded Reactor', 'surface', 7, ['original', 'hex', 'vision', 'three'], [0.5, 1], ['golden', 'reactor', 'peak']),
  o('electric-nexus', 'Electric Nexus', 'surface', 8, ['original', 'hex', 'vision', 'three'], [0.7, 1], ['electric', 'storming', 'peak']),
];

export const ORIGINAL_IDS: string[] = ORIGINALS.map((e) => e.id);

export function originalEntry(id: string): OriginalEntry | undefined {
  return ORIGINALS.find((e) => e.id === id);
}

/** Sentinel file marker: stage selections with this prefix render three.js. */
export const THREE_FILE_PREFIX = 'three:originals/';

export function originalIdFromFile(file: string): string | null {
  if (!file.startsWith(THREE_FILE_PREFIX)) return null;
  const variantId = file.slice(THREE_FILE_PREFIX.length);
  const found = ORIGINALS.find((e) => e.variantId === variantId);
  return found ? found.id : null;
}

// ── Stage pack (composed with catalog.packs in the UI; NOT in catalog.json,
// which stays 1:1 with the 86-shader GLSL CATALOG per catalog.test.ts) ─────────
const SOURCE = 'PORTFOLIO- origin/main lib/vision/visualizers (Vision mode)';

export const ORIGINALS_PACK: PackDef = {
  id: 'OriginalsPack',
  name: 'Originals',
  recommendedTheme: null,
  shaders: ORIGINALS.map(
    (e): ShaderDef => ({
      id: e.id,
      name: e.name,
      file: `${THREE_FILE_PREFIX}${e.variantId}`,
      source: SOURCE,
      energyLevel: null,
    }),
  ),
};

// ── Director defs (merged with ENGINE_DEFS; the planner's three params are
// carried for shape compatibility but only touch the GLSL renderers) ───────────
export const ORIGINAL_DEFS: DirectorVisual[] = ORIGINALS.map((e) => ({
  id: e.id,
  name: e.name,
  tags: [...e.themeTags],
  params: ENGINE_PARAMS.map((p) => ({ ...p })),
  meta: {
    themeTags: [...e.themeTags],
    energyRange: [e.energyRange[0], e.energyRange[1]],
    moods: [...e.moods],
  },
}));
