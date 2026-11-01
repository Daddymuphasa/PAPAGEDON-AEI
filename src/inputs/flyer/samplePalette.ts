// Client-side flyer sampling: real palette, energy and motifs from the
// banner pixels, so mock mode (no keys) still reacts to the actual flyer
// instead of returning one fixed theme. The pure pixel pass is unit-tested;
// only sampleFlyer touches the DOM.
import type { EventTheme } from '../../types';
import { CATALOG } from '../../../shaders/catalog';
import { deriveRoles } from '../../theme/roles';

/** Minimal catalog shape the mock scorer needs (CatalogEntry satisfies it). */
export interface CatalogLike {
  id: string;
  themeTags: string[];
  energyRange: [number, number];
  moods: string[];
}

export interface FlyerSample {
  palette: string[]; // hex, dominant first, up to 6
  weights: number[]; // normalized area share per palette colour
  energy: number; // 0-1 from luminance + saturation
  motifs: string[]; // color-character tags, at most 4
}

function toHex(r: number, g: number, b: number): string {
  const h = (v: number): string => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
}

export const SAMPLE_COLORS = 6;

export function samplePaletteFromPixels(
  rgba: ArrayLike<number>,
  w: number,
  h: number,
): FlyerSample {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  const total = Math.max(1, w * h);
  const stride = Math.max(1, Math.floor(total / 4000));
  let lumSum = 0;
  let satSum = 0;
  let n = 0;
  for (let i = 0; i < total; i += stride) {
    const r = rgba[i * 4] ?? 0;
    const g = rgba[i * 4 + 1] ?? 0;
    const b = rgba[i * 4 + 2] ?? 0;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cell = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    cell.count += 1;
    cell.r += r;
    cell.g += g;
    cell.b += b;
    buckets.set(key, cell);
    const [, s, l] = rgbToHsl(r, g, b);
    lumSum += l;
    satSum += s;
    n += 1;
  }
  const ranked = [...buckets.values()]
    .map((c) => ({ ...c, r: c.r / c.count, g: c.g / c.count, b: c.b / c.count }))
    .sort((a, b2) => b2.count - a.count);
  const picked: { r: number; g: number; b: number; hue: number; count: number }[] = [];
  for (const c of ranked) {
    if (picked.length >= SAMPLE_COLORS) break;
    const [hue] = rgbToHsl(c.r, c.g, c.b);
    if (picked.length > 0 && picked.every((p) => hueDist(p.hue, hue) < 0.05) && ranked.length > SAMPLE_COLORS) continue;
    picked.push({ r: c.r, g: c.g, b: c.b, hue, count: c.count });
  }
  while (picked.length < SAMPLE_COLORS) {
    const last = picked[picked.length - 1] ?? { r: 20, g: 20, b: 30, hue: 0, count: 0 };
    picked.push({ ...last, count: 0 }); // padding carries no area weight
  }
  const countSum = picked.reduce((a, p) => a + p.count, 0) || 1;
  const palette = picked.map((p) => toHex(p.r, p.g, p.b));
  const weights = picked.map((p) => p.count / countSum);
  const meanLum = n > 0 ? lumSum / n : 0.3;
  const meanSat = n > 0 ? satSum / n : 0.5;
  const energy = Math.min(1, Math.max(0.05, meanSat * 0.65 + meanLum * 0.45));

  // Honest color-character tags: what the pixels actually show.
  const motifs: string[] = [];
  const [dh, ds, dl] = rgbToHsl(picked[0]?.r ?? 0, picked[0]?.g ?? 0, picked[0]?.b ?? 0);
  const brightSat = ranked.some((c) => {
    const [, s, l] = rgbToHsl(c.r, c.g, c.b);
    return s > 0.6 && l > 0.45 && c.count > n * 0.02;
  });
  if (meanLum < 0.3 && brightSat) motifs.push('neon', 'night');
  else if (meanLum < 0.3) motifs.push('night', 'moody');
  if (ds > 0.45 && dh < 0.13) motifs.push('fire');
  if (ds > 0.35 && dh >= 0.08 && dh <= 0.17 && dl > 0.35) motifs.push('gold');
  if (ds > 0.3 && dh >= 0.45 && dh <= 0.7) motifs.push('ocean');
  if (meanSat > 0.55 && meanLum >= 0.3) motifs.push('festival');
  if (meanSat < 0.18) motifs.push('minimal');
  if (motifs.length === 0) motifs.push('vivid');
  return { palette, weights, energy, motifs: motifs.slice(0, 4) };
}

// Browser-only: decode + downscale the flyer, then run the pure sampler.
export function sampleFlyer(dataUrl: string): Promise<FlyerSample> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, 96 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('no 2d context'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        resolve(samplePaletteFromPixels(data, w, h));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => reject(new Error('could not decode flyer image'));
    img.src = dataUrl;
  });
}

function prettifyFileName(fileName: string): string {
  const base = fileName.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base) return 'Untitled Event';
  return base.length > 48 ? `${base.slice(0, 47).trimEnd()}…` : base;
}

function moodForSample(sample: FlyerSample): string {
  const tags = new Set(sample.motifs);
  if (sample.energy >= 0.75 && (tags.has('neon') || tags.has('ocean'))) return 'rave';
  if (sample.energy <= 0.35 && tags.has('minimal')) return 'lounge';
  if ((tags.has('fire') || tags.has('gold')) && tags.has('night')) return 'dark luxury';
  if (sample.energy > 0.7) return 'electric';
  if (sample.energy > 0.4) return 'warm';
  return 'calm';
}

export const MOCK_SUGGESTED_COUNT = 8;

// Replace the fixed mock theme's made-up values with sampled ones, and pick
// suggested visuals from the catalog by metadata match.
export function enhanceMockTheme(
  base: EventTheme,
  sample: FlyerSample,
  entries: CatalogLike[] = CATALOG,
  opts?: { fileName?: string },
): EventTheme {
  const words = sample.motifs.join(' ').toLowerCase();
  const scored = entries.map((d, i) => {
    let s = 0;
    if (sample.energy >= d.energyRange[0] && sample.energy <= d.energyRange[1]) s += 1;
    for (const tag of [...d.themeTags, ...d.moods]) {
      if (tag && words.includes(tag.toLowerCase())) s += 2;
    }
    return { id: d.id, s, i };
  });
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  const suggestedShaderIds = scored.slice(0, MOCK_SUGGESTED_COUNT).map((s) => s.id);
  return {
    ...base,
    eventName: opts?.fileName ? prettifyFileName(opts.fileName) : 'Untitled Event',
    mood: moodForSample(sample),
    palette: [...sample.palette],
    roles: deriveRoles(sample.palette, sample.weights),
    energy: sample.energy,
    motifs: [...sample.motifs],
    suggestedShaderIds: suggestedShaderIds.length > 0 ? suggestedShaderIds : [...base.suggestedShaderIds],
  };
}
