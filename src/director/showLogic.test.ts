import { describe, expect, test } from 'vitest';
import {
  isPhraseBoundary,
  mapThemeToOpening,
  shouldCallPlanner,
} from './showLogic';
import { mockTheme } from '../meta/mock';

const DEFS = [
  { id: 'hex-core', name: 'Hex Core' },
  { id: 'warp-tunnel', name: 'Warp Tunnel' },
];

describe('showLogic', () => {
  test('fires the first planner call immediately', () => {
    expect(shouldCallPlanner(0, null, null, false)).toBe(true);
  });

  test('fires on the 20s cadence', () => {
    expect(shouldCallPlanner(100, 80, 80, false)).toBe(true);
    expect(shouldCallPlanner(99, 80, 80, false)).toBe(false);
  });

  test('fires early on an energy shift', () => {
    expect(shouldCallPlanner(90, 80, 80, true)).toBe(true);
  });

  test('holds the 8s minimum gap even on shifts', () => {
    expect(shouldCallPlanner(85, 80, 60, true)).toBe(false);
    expect(shouldCallPlanner(88, 80, 60, true)).toBe(true);
  });

  test('detects phrase boundaries', () => {
    expect(isPhraseBoundary(7, 8)).toBe(false);
    expect(isPhraseBoundary(8, 8)).toBe(true);
    expect(isPhraseBoundary(15, 16)).toBe(false);
    expect(isPhraseBoundary(16, 16)).toBe(true);
  });

  test('maps an exact suggested id to the opening scene', () => {
    const theme = { ...mockTheme, suggestedShaderIds: ['warp-tunnel'] };
    expect(mapThemeToOpening(theme, DEFS)).toBe('warp-tunnel');
  });

  test('ignores name keywords: unknown ids fall to an energy-matched scene', () => {
    // mockTheme energy is 0.85; hex-core is the first catalog entry in range.
    const theme = { ...mockTheme, suggestedShaderIds: ['mega-tunnel-viz'] };
    expect(mapThemeToOpening(theme, DEFS)).toBe('hex-core');
  });

  test('falls back to the first visualizer without a theme', () => {
    const theme = { ...mockTheme, suggestedShaderIds: ['zzz-unknown'] };
    expect(mapThemeToOpening(theme, DEFS)).toBe('hex-core');
    expect(mapThemeToOpening(null, DEFS)).toBe('hex-core');
  });
});
