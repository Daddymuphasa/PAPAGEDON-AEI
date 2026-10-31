// M7 mock artwork: deterministic procedural images built from the theme
// palette, no network. Pure string building — runs on the server (mock
// path) and in Node tests. The SVG carries real dimensions so it decodes
// as an image, samples to palette colours, and uploads as a GL texture.
import type { EnergyTag } from '../types';

export const MOCK_ART_W = 896;
export const MOCK_ART_H = 512;

const TAG_ANGLE: Record<EnergyTag, number> = { calm: 15, build: 45, peak: 75, drop: 115 };
const FALLBACK_PALETTE = ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'];

function cleanPalette(palette: string[]): [string, string, string, string] {
  const ok = palette.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  const full = [...ok, ...FALLBACK_PALETTE].slice(0, 4);
  return [full[0], full[1], full[2], full[3]];
}

function seedFrom(tag: EnergyTag, palette: string[]): number {
  const s = `${tag}:${palette.join(',')}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Layered palette gradients with a tag-specific sweep angle and glow
// blobs placed by a tiny deterministic PRNG.
export function mockArtSvg(palette: string[], tag: EnergyTag): string {
  const [c0, c1, c2, c3] = cleanPalette(palette);
  let rng = seedFrom(tag, palette);
  const next = () => {
    rng ^= rng << 13;
    rng ^= rng >>> 17;
    rng ^= rng << 5;
    return (rng >>> 0) / 4294967296;
  };
  const blobs = [c1, c2, c3, c0, c2]
    .map((c) => {
      const cx = (next() * MOCK_ART_W).toFixed(0);
      const cy = (next() * MOCK_ART_H).toFixed(0);
      const r = (120 + next() * 260).toFixed(0);
      const o = (0.35 + next() * 0.4).toFixed(2);
      return `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${(Number(r) * 0.6).toFixed(0)}" fill="${c}" opacity="${o}"/>`;
    })
    .join('');
  const angle = TAG_ANGLE[tag];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MOCK_ART_W}" height="${MOCK_ART_H}" viewBox="0 0 ${MOCK_ART_W} ${MOCK_ART_H}">` +
    `<defs><linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">` +
    `<stop offset="0" stop-color="#0a0a0a"/><stop offset="0.45" stop-color="${c0}"/>` +
    `<stop offset="0.75" stop-color="${c1}"/><stop offset="1" stop-color="#0a0a0a"/>` +
    `</linearGradient></defs>` +
    `<rect width="${MOCK_ART_W}" height="${MOCK_ART_H}" fill="url(#g)"/>${blobs}` +
    `<rect width="${MOCK_ART_W}" height="${MOCK_ART_H}" fill="#000" opacity="0.25"/></svg>`
  );
}

export function mockImageDataUrl(palette: string[], tag: EnergyTag): string {
  return `data:image/svg+xml;base64,${btoa(mockArtSvg(palette, tag))}`;
}
