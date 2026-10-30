// M4 energy tracking: rolling windows plus build/drop/breakdown/shift
// detection over time. Pure: Node-safe and unit-tested.
import type { AudioEvent } from '../types';

export const SHORT_S = 2;
export const MED_S = 6;
export const LONG_S = 20;
export const BUILD_SLOPE = 0.06; // energy/sec over the 6s window
export const BUILD_MIN_RISE = 0.15;
export const DROP_JUMP = 0.22; // rise inside the 2s window after a build
export const DROP_PEAK = 0.75;
export const BREAKDOWN_LEVEL = 0.3;
export const BREAKDOWN_S = 8;
export const SHIFT_DELTA = 0.2; // med-vs-long average gap
export const SHIFT_S = 4; // recent confirmation span

export interface EnergySample {
  t: number; // seconds
  energy: number;
}

export class EnergyBuffer {
  private samples: EnergySample[] = [];

  push(t: number, energy: number): void {
    this.samples.push({ t, energy });
    const cutoff = t - LONG_S;
    while (this.samples.length > 0 && this.samples[0].t < cutoff) this.samples.shift();
  }

  window(seconds: number, now: number): EnergySample[] {
    return this.samples.filter((s) => s.t >= now - seconds);
  }

  // Window plus the one sample immediately before it, so a transition
  // starting just outside the window is still visible to edge scans.
  windowWithLead(seconds: number, now: number): EnergySample[] {
    const w = this.window(seconds, now);
    const lead = this.samples.filter((s) => s.t < now - seconds).pop();
    return lead === undefined ? w : [lead, ...w];
  }

  avg(seconds: number, now: number): number {
    const w = this.window(seconds, now);
    if (w.length === 0) return 0;
    return w.reduce((a, s) => a + s.energy, 0) / w.length;
  }

  peak(seconds: number, now: number): number {
    const w = this.window(seconds, now);
    return w.length === 0 ? 0 : Math.max(...w.map((s) => s.energy));
  }

  span(): number {
    if (this.samples.length < 2) return 0;
    return this.samples[this.samples.length - 1].t - this.samples[0].t;
  }
}

// Rising energy: enough slope and total rise over the 6s window.
export function isBuild(buf: EnergyBuffer, now: number): boolean {
  const w = buf.window(MED_S, now);
  if (w.length < 2 || now - w[0].t < MED_S - 1) return false;
  const rise = w[w.length - 1].energy - w[0].energy;
  return rise >= BUILD_MIN_RISE && rise / (w[w.length - 1].t - w[0].t) >= BUILD_SLOPE;
}

// Sharp jump right after a build (or straight to a high peak).
export function isDrop(buf: EnergyBuffer, now: number, wasBuild: boolean): boolean {
  const w = buf.windowWithLead(SHORT_S, now);
  if (w.length < 2) return false;
  let jump = 0;
  for (let i = 1; i < w.length; i++) jump = Math.max(jump, w[i].energy - w[i - 1].energy);
  if (jump < DROP_JUMP) return false;
  return wasBuild || buf.peak(SHORT_S, now) >= DROP_PEAK;
}

// Sustained low energy.
export function isBreakdown(buf: EnergyBuffer, now: number): boolean {
  const w = buf.window(BREAKDOWN_S, now);
  if (w.length < 2 || now - w[0].t < BREAKDOWN_S - 1) return false;
  return buf.avg(BREAKDOWN_S, now) < BREAKDOWN_LEVEL;
}

// Medium average clearly moved away from the long average, confirmed by
// the most recent span.
export function energyShifted(buf: EnergyBuffer, now: number): boolean {
  if (buf.span() < LONG_S - 1) return false;
  const long = buf.avg(LONG_S, now);
  return (
    Math.abs(buf.avg(MED_S, now) - long) >= SHIFT_DELTA &&
    Math.abs(buf.avg(SHIFT_S, now) - long) >= SHIFT_DELTA
  );
}

export function detectEvents(buf: EnergyBuffer, now: number, wasBuild: boolean): AudioEvent[] {
  const events: AudioEvent[] = [];
  if (isDrop(buf, now, wasBuild)) events.push('drop');
  else if (isBuild(buf, now)) events.push('build');
  if (isBreakdown(buf, now)) events.push('breakdown');
  return events;
}
