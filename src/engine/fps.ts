// M3 fps monitor + quality policy. Rolling average over the last 60
// frames; drops render scale when slow, steps back up when healthy.
export const FPS_FLOOR = 45;
export const FPS_RECOVER = 55;
export const SCALE_STEPS = [1, 0.75, 0.5];

export class FpsMonitor {
  scale = 1;
  private deltas: number[] = [];
  private last = 0;
  private lowFrames = 0;
  private highFrames = 0;

  tick(now: number): { fps: number; scale: number } {
    if (this.last > 0) {
      this.deltas.push(now - this.last);
      if (this.deltas.length > 60) this.deltas.shift();
    }
    this.last = now;
    const avg = this.deltas.length
      ? this.deltas.reduce((a, b) => a + b, 0) / this.deltas.length
      : 16.7;
    const fps = 1000 / Math.max(1, avg);
    const step = SCALE_STEPS.indexOf(this.scale);
    if (fps < FPS_FLOOR && step < SCALE_STEPS.length - 1) {
      this.highFrames = 0;
      if (++this.lowFrames >= 60) {
        this.lowFrames = 0;
        this.scale = SCALE_STEPS[step + 1];
      }
    } else if (fps > FPS_RECOVER && step > 0) {
      this.lowFrames = 0;
      if (++this.highFrames >= 120) {
        this.highFrames = 0;
        this.scale = SCALE_STEPS[step - 1];
      }
    } else {
      this.lowFrames = 0;
      this.highFrames = 0;
    }
    return { fps, scale: this.scale };
  }
}
