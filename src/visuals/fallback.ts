// M7 procedural fallback: when a generated image fails verification (and
// its one retry), the show falls back to a palette gradient rendered on
// a canvas. Stops are pure (unit-tested); rendering needs a browser.
import type { EnergyTag } from '../types';

export const FALLBACK_W = 512;
export const FALLBACK_H = 288;

export interface GradientStop {
  offset: number;
  color: string;
}

const TAG_ROTATION: Record<EnergyTag, number> = { calm: 0, build: 1, peak: 2, drop: 3 };

// Spread the palette across 0-1, rotated per tag so each energy level
// gets its own look. Always returns >= 2 stops.
export function fallbackGradientStops(palette: string[], tag: EnergyTag): GradientStop[] {
  const clean = palette.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  const colors = [...clean, '#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'].slice(0, 4);
  const rot = TAG_ROTATION[tag] % colors.length;
  const turned = [...colors.slice(rot), ...colors.slice(0, rot)];
  return turned.map((color, i) => ({ offset: i / (turned.length - 1), color }));
}

export function renderPaletteGradient(palette: string[], tag: EnergyTag): string {
  const stops = fallbackGradientStops(palette, tag);
  const canvas = document.createElement('canvas');
  canvas.width = FALLBACK_W;
  canvas.height = FALLBACK_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  const g = ctx.createLinearGradient(0, 0, FALLBACK_W, FALLBACK_H);
  for (const s of stops) g.addColorStop(s.offset, s.color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FALLBACK_W, FALLBACK_H);
  // Darken the edges so it sits under projector light like the real art.
  const shade = ctx.createRadialGradient(
    FALLBACK_W / 2,
    FALLBACK_H / 2,
    FALLBACK_H / 4,
    FALLBACK_W / 2,
    FALLBACK_H / 2,
    FALLBACK_W / 1.4,
  );
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, FALLBACK_W, FALLBACK_H);
  return canvas.toDataURL('image/png');
}
