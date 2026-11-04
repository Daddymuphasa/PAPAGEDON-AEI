// Auto render quality: watches real frame rate and steps the stage up
// or down so the show stays smooth on weak machines and rich on
// strong ones. Pure: Node-safe and unit-tested; the page applies the
// level to the GLSL + three.js renderers every frame.
export interface QualitySettings {
  /** Pixel-ratio cap for the GLSL stage canvases. */
  glDpr: number;
  /** Pixel-ratio cap for the nano-hex canvas. */
  hexDpr: number;
  /** Pixel-ratio cap for the immersive (bloom) canvas. */
  immDpr: number;
  /** Bloom multiplier: 1 full, 0.5 softened, 0 off. */
  bloom: number;
  /** Engine uDetail (pattern density). */
  detail: number;
  /** Nano-hex minimum ms between frames on wide screens. */
  hexMinFrameMs: number;
  /** Crossfade duration multiplier (shorter fades, less double-draw). */
  xfadeScale: number;
}

export const QUALITY_NAMES = ['High', 'Balanced', 'Lite', 'Saver'] as const;

export const QUALITY_LEVELS: QualitySettings[] = [
  { glDpr: 1.25, hexDpr: 1.25, immDpr: 1, bloom: 1, detail: 1, hexMinFrameMs: 20, xfadeScale: 1 },
  { glDpr: 1, hexDpr: 1, immDpr: 1, bloom: 1, detail: 0.85, hexMinFrameMs: 20, xfadeScale: 1 },
  { glDpr: 0.85, hexDpr: 0.85, immDpr: 0.85, bloom: 0.5, detail: 0.7, hexMinFrameMs: 33, xfadeScale: 0.7 },
  { glDpr: 0.75, hexDpr: 0.75, immDpr: 0.75, bloom: 0, detail: 0.55, hexMinFrameMs: 33, xfadeScale: 0.5 },
];

// Downgrade fast (2s of slow frames), upgrade slowly (8s of headroom
// per step) so the level never oscillates on borderline machines.
const DOWN_FPS = 45;
const UP_FPS = 57;
const DOWN_MS = 2000;
const UP_MS = 8000;
const START_LEVEL = 1;

export class QualityGovernor {
  level = START_LEVEL;
  private emaFps = 60;
  private lastT: number | null = null;
  private lastChange: number | null = null;

  /** Feed the rAF timestamp every frame; returns the level to apply. */
  update(nowMs: number): number {
    if (this.lastChange === null) {
      this.lastChange = nowMs;
      this.lastT = nowMs;
      return this.level;
    }
    if (this.lastT !== null) {
      const dt = nowMs - this.lastT;
      // Ignore tab-switch gaps; clamp wild single frames.
      if (dt > 0 && dt <= 250) {
        const fps = Math.min(120, Math.max(5, 1000 / dt));
        this.emaFps += (fps - this.emaFps) * 0.05;
      }
    }
    this.lastT = nowMs;
    const sinceChange = nowMs - (this.lastChange ?? nowMs);
    if (this.emaFps < DOWN_FPS && this.level < QUALITY_LEVELS.length - 1 && sinceChange >= DOWN_MS) {
      this.level += 1;
      this.lastChange = nowMs;
    } else if (this.emaFps > UP_FPS && this.level > 0 && sinceChange >= UP_MS) {
      this.level -= 1;
      this.lastChange = nowMs;
    }
    return this.level;
  }

  fps(): number {
    return this.emaFps;
  }
}
