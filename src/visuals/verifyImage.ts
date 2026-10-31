// M7 browser-side image verification: every generated image must decode,
// carry sane dimensions, and roughly match the theme palette. Pure pixel
// math lives in paletteCheck.ts (unit-tested); this module only touches
// Image/canvas, so it is browser-only.
import { paletteMatchPass, type Rgb } from './paletteCheck';

export const IMAGE_MIN_DIM = 64;
export const IMAGE_MAX_DIM = 4096;
export const IMAGE_SAMPLE_GRID = 8;

export interface ImageCheck {
  ok: boolean;
  reason: string;
  width: number;
  height: number;
  score: number;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image did not decode'));
    img.src = dataUrl;
  });
}

function samplePixels(img: HTMLImageElement): Rgb[] | null {
  const n = IMAGE_SAMPLE_GRID;
  const canvas = document.createElement('canvas');
  canvas.width = n;
  canvas.height = n;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, n, n);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, n, n);
  } catch {
    return null;
  }
  const out: Rgb[] = [];
  for (let i = 0; i < data.data.length; i += 4) {
    out.push([data.data[i], data.data[i + 1], data.data[i + 2]]);
  }
  return out;
}

export async function verifyEventImage(dataUrl: string, palette: string[]): Promise<ImageCheck> {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return { ok: false, reason: 'not an image data URL', width: 0, height: 0, score: 0 };
  }
  let img: HTMLImageElement;
  try {
    img = await loadImage(dataUrl);
  } catch {
    return { ok: false, reason: 'image did not decode', width: 0, height: 0, score: 0 };
  }
  const { naturalWidth: w, naturalHeight: h } = img;
  if (
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w < IMAGE_MIN_DIM ||
    h < IMAGE_MIN_DIM ||
    w > IMAGE_MAX_DIM ||
    h > IMAGE_MAX_DIM
  ) {
    return { ok: false, reason: `bad dimensions ${w}x${h}`, width: w, height: h, score: 0 };
  }
  const pixels = samplePixels(img);
  if (!pixels) {
    return { ok: false, reason: 'could not sample pixels', width: w, height: h, score: 0 };
  }
  const { pass, score } = paletteMatchPass(pixels, palette);
  return pass
    ? { ok: true, reason: `palette match ${(score * 100).toFixed(0)}%`, width: w, height: h, score }
    : { ok: false, reason: `palette match only ${(score * 100).toFixed(0)}%`, width: w, height: h, score };
}
