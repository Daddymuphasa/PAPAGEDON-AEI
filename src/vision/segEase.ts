// M9-A shared segmentation easer: eases grids/box/motion toward the
// latest tick every frame, fades stale masks, packs RGBA for upload.
// Used by the output window and the control preview. Pure math +
// typed arrays; Node-safe and unit-tested.
import { fadeAfterStale } from './signals';

export interface SegEaseTarget {
  perf: Uint8Array;
  crowd: Uint8Array;
  w: number;
  h: number;
  box: [number, number, number, number] | null; // xywh, normalized
  motion: number;
  strength: number;
}

export interface SegEaseFrame {
  rgba: Uint8ClampedArray;
  w: number;
  h: number;
  box: [number, number, number, number];
  motion: number;
  mix: number;
}

export const SEG_EASE_RATE = 5; // per-second ease toward the target

export class SegEaser {
  private target: SegEaseTarget | null = null;
  private perf: Float32Array | null = null;
  private crowd: Float32Array | null = null;
  private rgba: Uint8ClampedArray | null = null;
  private box: [number, number, number, number] = [0, 0, 0, 0];
  private motion = 0;
  private at = 0;

  setTarget(t: SegEaseTarget, nowMs: number): void {
    this.target = t;
    this.at = nowMs;
  }

  get hasTarget(): boolean {
    return this.target !== null;
  }

  frame(dtMs: number, nowMs: number): SegEaseFrame | null {
    const t = this.target;
    if (t === null) return null;
    const n = t.w * t.h;
    if (this.perf === null || this.crowd === null || this.rgba === null || this.perf.length !== n) {
      this.perf = new Float32Array(n);
      this.crowd = new Float32Array(n);
      this.rgba = new Uint8ClampedArray(n * 4);
    }
    const k = 1 - Math.exp((-Math.max(0, dtMs) / 1000) * SEG_EASE_RATE);
    const perf = this.perf;
    const crowd = this.crowd;
    const rgba = this.rgba;
    for (let i = 0; i < n; i++) {
      perf[i] += (t.perf[i] - perf[i]) * k;
      crowd[i] += (t.crowd[i] - crowd[i]) * k;
      rgba[i * 4] = Math.round(perf[i] * 255);
      rgba[i * 4 + 1] = Math.round(crowd[i] * 255);
      rgba[i * 4 + 2] = 0;
      rgba[i * 4 + 3] = 255;
    }
    // A missing box collapses in place so the rim never snaps away.
    const want = t.box ?? [this.box[0] + this.box[2] / 2, this.box[1] + this.box[3] / 2, 0, 0];
    for (let i = 0; i < 4; i++) this.box[i] += (want[i] - this.box[i]) * k;
    this.motion += (t.motion - this.motion) * k;
    return {
      rgba,
      w: t.w,
      h: t.h,
      box: [...this.box] as [number, number, number, number],
      motion: this.motion,
      mix: t.strength * fadeAfterStale(nowMs - this.at),
    };
  }
}
