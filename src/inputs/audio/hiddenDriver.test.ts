import { describe, expect, test } from 'vitest';
import { STANDBY_TAKEOVER_MS, STANDBY_TICK_BLOCKS, STANDBY_WORKLET_SRC, shouldDriveFromStandby } from './hiddenDriver';

describe('shouldDriveFromStandby', () => {
  test('drives before the first rAF frame and after silence', () => {
    expect(shouldDriveFromStandby(1000, null)).toBe(true);
    expect(shouldDriveFromStandby(1000, 1000 - STANDBY_TAKEOVER_MS)).toBe(true);
    expect(shouldDriveFromStandby(1000, 1000 - STANDBY_TAKEOVER_MS + 1)).toBe(false);
    expect(shouldDriveFromStandby(1000, 1000)).toBe(false);
  });
});

describe('STANDBY_WORKLET_SRC', () => {
  test('registers a silent ticking processor', () => {
    expect(STANDBY_WORKLET_SRC).toContain("registerProcessor('aei-tick'");
    expect(STANDBY_WORKLET_SRC).toContain('postMessage');
    expect(STANDBY_WORKLET_SRC).toContain('fill(0)');
    expect(STANDBY_WORKLET_SRC).toContain(`% ${STANDBY_TICK_BLOCKS}`);
    expect(STANDBY_TICK_BLOCKS).toBeGreaterThan(0);
  });
});
