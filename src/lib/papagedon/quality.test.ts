// Quality governor: downgrades fast on slow frames, upgrades slowly
// on headroom, and never oscillates or runs past the ends.
import { describe, expect, test } from 'vitest';
import { QUALITY_LEVELS, QUALITY_NAMES, QualityGovernor } from './quality';

describe('quality governor', () => {
  test('starts Balanced and exposes one setting set per named level', () => {
    const g = new QualityGovernor();
    expect(g.level).toBe(1);
    expect(QUALITY_LEVELS).toHaveLength(QUALITY_NAMES.length);
    // Higher levels strictly shed load.
    for (let i = 1; i < QUALITY_LEVELS.length; i++) {
      expect(QUALITY_LEVELS[i].glDpr).toBeLessThanOrEqual(QUALITY_LEVELS[i - 1].glDpr);
      expect(QUALITY_LEVELS[i].detail).toBeLessThan(QUALITY_LEVELS[i - 1].detail);
    }
  });

  test('steps down on sustained slow frames', () => {
    const g = new QualityGovernor();
    let t = 100000;
    g.update(t);
    // ~30fps for 3s: ema sinks below 45, two downgrade windows pass.
    for (let i = 0; i < 90; i++) {
      t += 33;
      g.update(t);
    }
    expect(g.level).toBeGreaterThan(1);
  });

  test('steps up slowly on sustained headroom', () => {
    const g = new QualityGovernor();
    let t = 200000;
    g.update(t);
    // Sink it first.
    for (let i = 0; i < 120; i++) {
      t += 40;
      g.update(t);
    }
    const low = g.level;
    expect(low).toBeGreaterThan(1);
    // Then 60fps for 20s: climbs back toward High, one step per 8s.
    for (let i = 0; i < 1200; i++) {
      t += 16.7;
      g.update(t);
    }
    expect(g.level).toBeLessThan(low);
  });

  test('ignores tab-switch gaps and clamps at the ends', () => {
    const g = new QualityGovernor();
    let t = 300000;
    g.update(t);
    g.update(t + 5000); // backgrounded tab: no crash, no instant dump
    expect(g.level).toBe(1);
    // Jam it at the bottom; it must stop at the last level.
    for (let i = 0; i < 600; i++) {
      t += 100;
      g.update(t);
    }
    expect(g.level).toBe(QUALITY_LEVELS.length - 1);
  });
});
