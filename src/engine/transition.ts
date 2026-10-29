// M3 crossfade driver: smoothstep 0->1 mix over a fixed duration.
export class Crossfade {
  active = false;
  mix = 0;
  private t0 = 0;

  constructor(private durationMs = 600) {}

  begin(now: number): void {
    this.active = true;
    this.t0 = now;
    this.mix = 0;
  }

  // Returns the current mix, or null when idle. done=true on the final tick.
  // Zero duration (reduced motion) cuts instantly.
  tick(now: number): { mix: number; done: boolean } | null {
    if (!this.active) return null;
    const k = this.durationMs <= 0 ? 1 : Math.min(1, (now - this.t0) / this.durationMs);
    this.mix = k * k * (3 - 2 * k);
    if (k >= 1) this.active = false;
    return { mix: this.mix, done: k >= 1 };
  }
}
