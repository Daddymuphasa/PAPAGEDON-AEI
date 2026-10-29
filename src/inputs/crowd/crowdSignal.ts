// INPUT 3 skeleton (M5, optional): throttled camera frames ->
// SAM 3.1 -> CrowdSignal. Capture + /api/crowd route land in M5.
import type { CrowdSignal } from '../../types';

export const CROWD_FRAME_INTERVAL_MS = 3000;

export function shouldSampleCrowd(lastSampleAt: number, now = Date.now()): boolean {
  return now - lastSampleAt >= CROWD_FRAME_INTERVAL_MS;
}

export function mockCrowd(t: number): CrowdSignal {
  return {
    density: 0.6 + 0.3 * Math.sin(t * 0.2),
    movement: 0.5 + 0.4 * Math.sin(t * 0.9),
    timestamp: Date.now(),
  };
}
