// M8 vision signals: detection grids -> coverage/motion, smoothing,
// stale fade, grid transport, payload verification. Pure + Node-safe;
// shared by the segment route (server) and the show pages (browser).
import type { NormBox, SegChannelData, SegResultData } from '../types';

export const SEG_GRID_W = 128;
export const SEG_MAX_COUNT = 50;
export const SEG_SMOOTH_ALPHA = 0.5;
export const SEG_STALE_HOLD_MS = 10_000;
export const SEG_FADE_MS = 2_000;

export interface SegObject {
  box: NormBox;
  mask: { raster: Uint8Array; w: number; h: number } | null;
}

// Grid height for the frame aspect at the fixed 128px width.
export function segGridHeight(frameW: number, frameH: number, gridW = SEG_GRID_W): number {
  if (!(frameW > 0) || !(frameH > 0)) return Math.round((gridW * 3) / 4);
  return Math.min(SEG_GRID_W, Math.max(8, Math.round((gridW * frameH) / frameW)));
}

// Rasterize one channel into a w*h binary grid: decoded mask pixels win,
// box-only detections fill their rect.
export function rasterizeChannel(objects: SegObject[], gridW: number, gridH: number): Uint8Array {
  const grid = new Uint8Array(gridW * gridH);
  const set = (fx: number, fy: number) => {
    const gx = Math.floor(fx * gridW);
    const gy = Math.floor(fy * gridH);
    if (gx >= 0 && gy >= 0 && gx < gridW && gy < gridH) grid[gy * gridW + gx] = 1;
  };
  for (const o of objects) {
    const { box, mask } = o;
    if (mask !== null && mask.w > 0 && mask.h > 0 && mask.raster.length >= mask.w * mask.h) {
      for (let my = 0; my < mask.h; my++) {
        for (let mx = 0; mx < mask.w; mx++) {
          if (mask.raster[my * mask.w + mx] === 0) continue;
          set(
            box.x0 + ((mx + 0.5) / mask.w) * (box.x1 - box.x0),
            box.y0 + ((my + 0.5) / mask.h) * (box.y1 - box.y0),
          );
        }
      }
    } else {
      const x0 = Math.max(0, Math.floor(box.x0 * gridW));
      const y0 = Math.max(0, Math.floor(box.y0 * gridH));
      const x1 = Math.min(gridW, Math.ceil(box.x1 * gridW));
      const y1 = Math.min(gridH, Math.ceil(box.y1 * gridH));
      for (let gy = y0; gy < y1; gy++) {
        for (let gx = x0; gx < x1; gx++) grid[gy * gridW + gx] = 1;
      }
    }
  }
  return grid;
}

// Share of the frame the channel covers, 0-1.
export function coverageOf(grid: Uint8Array): number {
  if (grid.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < grid.length; i++) n += grid[i] === 0 ? 0 : 1;
  return n / grid.length;
}

// Share of cells that changed between two grids, 0-1. Mismatched sizes
// mean incomparable frames — report still (0), never spike the show.
export function motionBetween(prev: Uint8Array, next: Uint8Array): number {
  if (prev.length === 0 || prev.length !== next.length) return 0;
  let n = 0;
  for (let i = 0; i < prev.length; i++) n += prev[i] === next[i] ? 0 : 1;
  return n / prev.length;
}

export function smoothValue(prev: number, next: number, alpha = SEG_SMOOTH_ALPHA): number {
  return prev + (next - prev) * alpha;
}

// Boxes ease toward the new read; a missing read holds the last box
// (presence fades separately) so the frame never snaps to a corner.
export function smoothBox(prev: NormBox | null, next: NormBox | null, alpha = SEG_SMOOTH_ALPHA): NormBox | null {
  if (next === null) return prev;
  if (prev === null) return { ...next };
  return {
    x0: smoothValue(prev.x0, next.x0, alpha),
    y0: smoothValue(prev.y0, next.y0, alpha),
    x1: smoothValue(prev.x1, next.x1, alpha),
    y1: smoothValue(prev.y1, next.y1, alpha),
  };
}

// Full strength while fresh, hold 10s stale, then a 2s fade to zero.
export function fadeAfterStale(ageMs: number): number {
  if (ageMs < SEG_STALE_HOLD_MS) return 1;
  return Math.max(0, 1 - (ageMs - SEG_STALE_HOLD_MS) / SEG_FADE_MS);
}

export function encodeGrid(grid: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(grid).toString('base64');
  let s = '';
  for (let i = 0; i < grid.length; i++) s += String.fromCharCode(grid[i]);
  return btoa(s);
}

export function decodeGrid(data: string, w: number, h: number): Uint8Array | null {
  try {
    const bytes: Uint8Array =
      typeof Buffer !== 'undefined'
        ? Uint8Array.from(Buffer.from(data, 'base64'))
        : Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    return bytes.length === w * h ? bytes : null;
  } catch {
    return null;
  }
}

function isNormBox(b: unknown): b is NormBox {
  if (typeof b !== 'object' || b === null) return false;
  const o = b as Record<string, unknown>;
  for (const k of ['x0', 'y0', 'x1', 'y1']) {
    if (typeof o[k] !== 'number' || !Number.isFinite(o[k]) || (o[k] as number) < 0 || (o[k] as number) > 1)
      return false;
  }
  return (o.x1 as number) > (o.x0 as number) && (o.y1 as number) > (o.y0 as number);
}

function verifyChannel(ch: unknown, name: string): string[] {
  const errors: string[] = [];
  if (typeof ch !== 'object' || ch === null) return [`${name} is not an object`];
  const o = ch as Record<string, unknown>;
  if (!Array.isArray(o.boxes) || o.boxes.length > SEG_MAX_COUNT || !o.boxes.every(isNormBox)) {
    errors.push(`${name}.boxes must be <=${SEG_MAX_COUNT} normalized boxes`);
  }
  const m = o.mask as Record<string, unknown> | undefined;
  const dimsOk =
    typeof m === 'object' &&
    m !== null &&
    Number.isInteger(m.w) &&
    Number.isInteger(m.h) &&
    (m.w as number) >= 1 &&
    (m.h as number) >= 1 &&
    (m.w as number) <= SEG_GRID_W &&
    (m.h as number) <= SEG_GRID_W;
  if (!dimsOk || typeof m?.data !== 'string' || decodeGrid(m.data as string, m.w as number, m.h as number) === null) {
    errors.push(`${name}.mask must be a w*h byte grid at <=${SEG_GRID_W}px`);
  }
  if (o.count !== (Array.isArray(o.boxes) ? o.boxes.length : -1)) errors.push(`${name}.count must match boxes`);
  return errors;
}

// Validate a route result before it touches the director or projector.
export function verifySegResult(data: unknown): { ok: boolean; errors: string[] } {
  if (typeof data !== 'object' || data === null) return { ok: false, errors: ['result is not an object'] };
  const o = data as Record<string, unknown>;
  const errors = [...verifyChannel(o.performer, 'performer'), ...verifyChannel(o.crowd, 'crowd')];
  return { ok: errors.length === 0, errors };
}

export function emptyChannel(w: number, h: number): SegChannelData {
  return { boxes: [], mask: { w, h, data: encodeGrid(new Uint8Array(w * h)) }, count: 0 };
}

export function emptyResult(w: number, h: number): SegResultData {
  return { performer: emptyChannel(w, h), crowd: emptyChannel(w, h) };
}
