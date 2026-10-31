// M8 mock segmentation: synthetic moving performer blob + crowd band.
// Pure function of time — deterministic, zero network. The route serves
// this in MOCK mode; the client pipeline is identical to live.
import type { NormBox } from '../types';

export interface MockSegFrame {
  perf: Uint8Array;
  crowd: Uint8Array;
  box: NormBox;
  performerCount: number;
  crowdCount: number;
}

// Twelve head boxes riding the band edge, so mock counts match boxes.
export function mockCrowdBoxes(tSec: number): NormBox[] {
  const boxes: NormBox[] = [];
  for (let i = 0; i < 12; i++) {
    const cx = (i + 0.5) / 12;
    const edge = 0.7 + 0.02 * Math.sin(cx * 25 + tSec * 2) + 0.015 * Math.sin(cx * 61 - tSec * 3.1);
    const bob = 0.008 * Math.sin(tSec * 3 + i * 1.7);
    boxes.push({
      x0: clamp01(cx - 0.03),
      y0: clamp01(edge - 0.09 + bob),
      x1: clamp01(cx + 0.03),
      y1: clamp01(edge + 0.02 + bob),
    });
  }
  return boxes;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function mockSegFrame(tSec: number, gridW: number, gridH: number): MockSegFrame {
  const perf = new Uint8Array(gridW * gridH);
  const crowd = new Uint8Array(gridW * gridH);
  // Performer: an ellipse drifting across the upper-middle stage.
  const cx = 0.5 + 0.25 * Math.sin(tSec * 0.5);
  const cy = 0.42 + 0.08 * Math.sin(tSec * 0.8 + 1);
  const rx = 0.09;
  const ry = 0.17;
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const fx = (gx + 0.5) / gridW;
      const fy = (gy + 0.5) / gridH;
      const dx = (fx - cx) / rx;
      const dy = (fy - cy) / ry;
      if (dx * dx + dy * dy <= 1) perf[gy * gridW + gx] = 1;
      // Crowd: a band with a rippling top edge and nodding heads.
      const edge = 0.7 + 0.02 * Math.sin(fx * 25 + tSec * 2) + 0.015 * Math.sin(fx * 61 - tSec * 3.1);
      if (fy >= edge) crowd[gy * gridW + gx] = 1;
    }
  }
  return {
    perf,
    crowd,
    box: { x0: clamp01(cx - rx), y0: clamp01(cy - ry), x1: clamp01(cx + rx), y1: clamp01(cy + ry) },
    performerCount: 1,
    crowdCount: 12,
  };
}
