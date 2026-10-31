// M7 palette check (pure math). The browser sampler in verifyImage.ts
// feeds sampled pixels here; vitest feeds synthetic pixels.
export type Rgb = [number, number, number];

// Share of sampled pixels that must sit near the theme palette.
export const PALETTE_MATCH_MIN = 0.45;
// Per-channel tolerance (0-255) for "near" a palette colour.
export const PALETTE_TOLERANCE = 64;

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function nearPixel(p: Rgb, c: Rgb): boolean {
  return (
    Math.abs(p[0] - c[0]) <= PALETTE_TOLERANCE &&
    Math.abs(p[1] - c[1]) <= PALETTE_TOLERANCE &&
    Math.abs(p[2] - c[2]) <= PALETTE_TOLERANCE
  );
}

// Share of pixels near ANY palette colour. Empty inputs score 0.
export function paletteMatchScore(pixels: Rgb[], palette: string[]): number {
  const colors = palette.map(hexToRgb).filter((c): c is Rgb => c !== null);
  if (pixels.length === 0 || colors.length === 0) return 0;
  let hits = 0;
  for (const p of pixels) {
    if (colors.some((c) => nearPixel(p, c))) hits += 1;
  }
  return hits / pixels.length;
}

export function paletteMatchPass(pixels: Rgb[], palette: string[]): { pass: boolean; score: number } {
  const score = paletteMatchScore(pixels, palette);
  return { pass: score >= PALETTE_MATCH_MIN, score };
}
