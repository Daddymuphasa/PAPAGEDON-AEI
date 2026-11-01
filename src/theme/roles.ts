// Event colour roles: the flyer's inks mapped to jobs (background,
// primary, secondary, accent, highlight) so the show's identity never
// depends on palette slot order. Pure math, no DOM: shared by the mock
// sampler (client), the live normaliser and judge (server), the director
// and both render pages. Tested in roles.test.ts.
import type { ThemeRoles } from '../types';

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(s: unknown): s is string {
  return typeof s === 'string' && HEX.test(s);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number): string => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function hexToHsl(hex: string): [number, number, number] {
  const [ri, gi, bi] = parseHex(hex);
  const r = ri / 255;
  const g = gi / 255;
  const b = bi / 255;
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

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 1) + 1) % 1;
  const sat = clamp(s, 0, 1);
  const lit = clamp(l, 0, 1);
  if (sat === 0) {
    const v = Math.round(lit * 255);
    return rgbToHex(v, v, v);
  }
  const q = lit < 0.5 ? lit * (1 + sat) : lit + sat - lit * sat;
  const p = 2 * lit - q;
  const f = (t: number): number => {
    const tt = ((t % 1) + 1) % 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return rgbToHex(f(hue + 1 / 3) * 255, f(hue) * 255, f(hue - 1 / 3) * 255);
}

/** Circular hue distance, 0 (same) to 0.5 (opposite). */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
}

const FALLBACK_ROLES: ThemeRoles = {
  background: '#07070c',
  primary: '#ff2d78',
  secondary: '#7b2dff',
  accent: '#00e5ff',
  highlight: '#ffd166',
};

interface Item {
  hex: string;
  h: number;
  s: number;
  l: number;
  w: number;
  i: number;
}

/**
 * Map a raw palette (dominant first, any length) to colour roles.
 * weights are per-colour area shares; without them every colour counts
 * equally. The background ink never becomes the primary, and a light
 * flyer still gets a dark wall (a deep shade of the primary hue).
 */
export function deriveRoles(palette: string[], weights?: number[]): ThemeRoles {
  const clean = palette.filter(isHexColor);
  if (clean.length === 0) return { ...FALLBACK_ROLES };
  const rawW = clean.map((_, i) => weights?.[i] ?? 1);
  const wSum = rawW.reduce((a, b) => a + b, 0) || 1;
  const items: Item[] = clean.map((hex, i) => {
    const [h, s, l] = hexToHsl(hex);
    return { hex, h, s, l, w: (rawW[i] ?? 0) / wSum, i };
  });
  // Characteristic = saturation biased by area, never near-black/white.
  const score = (it: Item): number => it.s * (0.3 + 0.7 * it.w);
  const chromatic = items.filter((it) => it.l >= 0.09 && it.l <= 0.88);
  const pool = chromatic.length > 0 ? chromatic : items;
  const primary = [...pool].sort((a, b) => score(b) - score(a) || a.i - b.i)[0] as Item;

  // Secondary/accent: next most characteristic hues, >= 30 degrees apart.
  const rest = items.filter((it) => it !== primary).sort((a, b) => score(b) - score(a) || a.i - b.i);
  const picked: Item[] = [primary];
  for (const it of rest) {
    if (picked.length >= 3) break;
    if (picked.every((p) => hueDistance(p.h, it.h) >= 1 / 12)) picked.push(it);
  }
  for (const it of rest) {
    if (picked.length >= 3) break;
    if (!picked.includes(it)) picked.push(it);
  }
  while (picked.length < 3) picked.push(primary);
  const secondary = picked[1] as Item;
  const accent = picked[2] as Item;

  // Highlight: the brightest ink; lifted toward white when the flyer is dark.
  const brightest = [...items].sort((a, b) => b.l - a.l || b.s - a.s)[0] as Item;
  let highlight = brightest.hex;
  if (brightest.l < 0.5) {
    const [r, g, b] = parseHex(brightest.hex);
    highlight = rgbToHex(r + (255 - r) * 0.55, g + (255 - g) * 0.55, b + (255 - b) * 0.55);
  }

  // Background: the darkest low-saturation ink; on a light flyer a deep
  // shade of the primary hue so the wall always stays dark.
  const darks = items
    .filter((it) => it.s < 0.55)
    .sort((a, b) => a.l - b.l);
  const background =
    darks.length > 0 && (darks[0] as Item).l <= 0.4
      ? (darks[0] as Item).hex
      : hslToHex(primary.h, clamp(primary.s, 0.45, 0.75), 0.055);

  // Projector normalisation: nothing muddy, nothing washed out.
  const shape = (hex: string, sMin: number, sMax: number, lMin: number, lMax: number): string => {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h, clamp(s, sMin, sMax), clamp(l, lMin, lMax));
  };
  let bg = shape(background, 0, 1, 0, 0.12);
  const pri = shape(primary.hex, 0.35, 1, 0.3, 0.7);
  const sec = shape(secondary.hex, 0.2, 1, 0.25, 0.75);
  const acc = shape(accent.hex, 0.2, 1, 0.25, 0.75);
  const [bgH, , bgL] = hexToHsl(bg);
  const [priH, , priL] = hexToHsl(pri);
  if (hueDistance(bgH, priH) < 1 / 12 && Math.abs(bgL - priL) < 0.25) {
    bg = hslToHex(bgH, 0.5, 0.04); // primary must read against the wall
  }
  const [hiH, hiS, hiL] = hexToHsl(highlight);
  const hi = hslToHex(hiH, hiS * 0.9, Math.max(hiL, 0.62));
  return { background: bg, primary: pri, secondary: sec, accent: acc, highlight: hi };
}

function isFullRoles(r: unknown): r is ThemeRoles {
  if (typeof r !== 'object' || r === null) return false;
  const c = r as Record<string, unknown>;
  return (
    isHexColor(c.background) &&
    isHexColor(c.primary) &&
    isHexColor(c.secondary) &&
    isHexColor(c.accent) &&
    isHexColor(c.highlight)
  );
}

/**
 * Accept a model-provided roles object, repairing invalid slots from the
 * palette. Old cached themes without roles get fully derived ones, so
 * mock and live always produce the same shape.
 */
export function coerceRoles(palette: string[], candidate: unknown): ThemeRoles {
  const derived = deriveRoles(palette);
  if (!isFullRoles(candidate)) return derived;
  const roles: ThemeRoles = { ...candidate };
  const [, , bgL] = hexToHsl(roles.background);
  if (bgL > 0.4) roles.background = derived.background; // wall must stay dark
  const [, pS, pL] = hexToHsl(roles.primary);
  if (pS < 0.2 || pL < 0.12 || pL > 0.85) roles.primary = derived.primary; // primary must be an ink
  return roles;
}

/** The 4 shader slots, in role order. Background is not a slot yet. */
export function rolesToDisplayPalette(theme: { palette: string[]; roles?: ThemeRoles }): [string, string, string, string] {
  const roles = coerceRoles(theme.palette, theme.roles);
  return [roles.primary, roles.secondary, roles.accent, roles.highlight];
}

/** Repeat the nearest slot so short palettes never pad with black. */
export function fillSlots(palette: string[]): [string, string, string, string] {
  const clean = palette.filter(isHexColor);
  if (clean.length === 0) return ['#202020', '#202020', '#202020', '#202020'];
  return [0, 1, 2, 3].map((i) => clean[Math.min(i, clean.length - 1)] as string) as [string, string, string, string];
}

/**
 * Role-aware variation for ShowPlan.paletteEmphasis (0-3). The primary
 * always stays in slot 0 — only secondary/accent/highlight permute —
 * so the event identity never jumps to an unrelated hue.
 */
export function applyPaletteVariation(slots: string[], emphasis: number): [string, string, string, string] {
  const [p, a, b, c] = fillSlots(slots);
  const e = ((Math.round(emphasis) % 4) + 4) % 4;
  if (e === 1) return [p, b, c, a];
  if (e === 2) return [p, c, a, b];
  if (e === 3) return [p, a, c, b];
  return [p, a, b, c];
}

/** Exponential palette glide: shown moves a k fraction toward target. */
export function easePaletteToward(shown: string[], target: string[], k: number): [string, string, string, string] {
  const s = fillSlots(shown);
  const t = fillSlots(target);
  const kk = clamp(k, 0, 1);
  if (kk <= 0) return s;
  if (kk >= 1) return t;
  return [0, 1, 2, 3].map((i) => {
    const [r1, g1, b1] = parseHex(s[i] as string);
    const [r2, g2, b2] = parseHex(t[i] as string);
    return rgbToHex(r1 + (r2 - r1) * kk, g1 + (g2 - g1) * kk, b1 + (b2 - b1) * kk);
  }) as [string, string, string, string];
}
