import { describe, expect, test } from 'vitest';
import {
  isPhraseBoundary,
  mapThemeToOpening,
  shouldCallPlanner,
} from './showLogic';
import { mockTheme } from '../meta/mock';

const DEFS = [
  { id: 'BadmanExperiencePack/03_inferno_lasers', name: 'Inferno Lasers' },
  { id: 'PulsePack/01_kick_pump', name: 'Kick Pump' },
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
    const theme = { ...mockTheme, suggestedShaderIds: ['PulsePack/01_kick_pump'] };
    expect(mapThemeToOpening(theme, DEFS)).toBe('PulsePack/01_kick_pump');
  });

  test('ignores name keywords: unknown ids fall to an energy-matched scene', () => {
    // mockTheme energy is 0.85; inferno-lasers is the first catalog entry in range.
    const theme = { ...mockTheme, suggestedShaderIds: ['mega-tunnel-viz'] };
    expect(mapThemeToOpening(theme, DEFS)).toBe('BadmanExperiencePack/03_inferno_lasers');
  });

  test('falls back to the first visualizer without a theme', () => {
    const theme = { ...mockTheme, suggestedShaderIds: ['zzz-unknown'] };
    expect(mapThemeToOpening(theme, DEFS)).toBe('BadmanExperiencePack/03_inferno_lasers');
    expect(mapThemeToOpening(null, DEFS)).toBe('BadmanExperiencePack/03_inferno_lasers');
  });
});
