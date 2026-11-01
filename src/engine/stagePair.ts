// StagePair: one fragment-shader canvas + one three.js canvas stacked in
// the same frame. Fragment<->fragment transitions stay on the page's GPU
// crossfade; anything involving a 3D scene dips through black (~500ms) so
// there is never a hard cut. Written from scratch for the 3D stage.
import type { AudioFeatures } from '../types';
import { getScene, isSceneId } from '../../scenes/registry';
import { ThreeStage } from './threeStage';

export type StageBackend = 'gl' | 'three';

const DIP_OUT_MS = 250;
const DIP_IN_MS = 250;

export class StagePair {
  readonly three: ThreeStage | null;
  private readonly glCanvas: HTMLCanvasElement;
  private readonly threeCanvas: HTMLCanvasElement;
  private backend: StageBackend = 'gl';
  private dip: { t0: number; target: StageBackend; swapped: boolean } | null = null;
  private pendingSwap: (() => void) | null = null;

  constructor(glCanvas: HTMLCanvasElement, threeCanvas: HTMLCanvasElement) {
    this.glCanvas = glCanvas;
    this.threeCanvas = threeCanvas;
    threeCanvas.style.position = 'absolute';
    threeCanvas.style.inset = '0';
    threeCanvas.style.width = '100%';
    threeCanvas.style.height = '100%';
    threeCanvas.style.display = 'none';
    let three: ThreeStage | null = null;
    try {
      three = new ThreeStage(threeCanvas);
    } catch {
      three = null;
    }
    this.three = three;
  }

  /** True when the id names a 3D scene and the three stage is alive. */
  wantsThree(visualId: string): boolean {
    return this.three !== null && isSceneId(visualId);
  }

  /**
   * Begin a transition to visualId. For fragment->fragment the caller's
   * own GPU crossfade runs (applyGl) and 'gl' is returned. Otherwise a
   * dip starts, the swap runs at the midpoint, and 'dip' is returned.
   */
  request(visualId: string, applyGl: () => void): 'gl' | 'dip' {
    const target: StageBackend = this.wantsThree(visualId) ? 'three' : 'gl';
    if (target === 'gl' && this.backend === 'gl' && this.dip === null) {
      applyGl();
      return 'gl';
    }
    if (target === this.backend && this.dip === null && target === 'three') {
      // Scene->scene still dips (one three canvas); fall through.
    }
    this.dip = { t0: performance.now(), target, swapped: false };
    this.pendingSwap = () => {
      if (target === 'three') {
        const def = getScene(visualId);
        if (def) this.three?.setScene(def);
      } else {
        applyGl();
      }
    };
    return 'dip';
  }

  /**
   * Advance the dip; call every frame before rendering. Returns the
   * backend the page should render into this frame.
   */
  frame(now: number): StageBackend {
    const dip = this.dip;
    if (!dip) return this.backend;
    const outCanvas = this.backend === 'gl' ? this.glCanvas : this.threeCanvas;
    const inCanvas = dip.target === 'gl' ? this.glCanvas : this.threeCanvas;
    if (!dip.swapped && now - dip.t0 >= DIP_OUT_MS) {
      dip.swapped = true;
      this.backend = dip.target;
      try {
        this.pendingSwap?.();
      } finally {
        this.pendingSwap = null;
      }
    }
    if (!dip.swapped) {
      outCanvas.style.opacity = String(Math.max(0, 1 - (now - dip.t0) / DIP_OUT_MS));
      inCanvas.style.display = 'none';
      return this.backend;
    }
    outCanvas.style.display = 'none';
    outCanvas.style.opacity = '1';
    inCanvas.style.display = 'block';
    const k = Math.min(1, (now - dip.t0 - DIP_OUT_MS) / DIP_IN_MS);
    inCanvas.style.opacity = String(k);
    if (k >= 1) {
      inCanvas.style.opacity = '1';
      this.dip = null;
    }
    return this.backend;
  }

  renderThree(
    time: number,
    f: AudioFeatures,
    palette: string[],
    intensity: number,
    speed: number,
    pulse: number,
    extra: [number, number, number],
    scale: number,
    motion = 0,
  ): void {
    this.three?.render(time, f, palette, intensity, speed, pulse, extra, scale, motion);
  }
}
