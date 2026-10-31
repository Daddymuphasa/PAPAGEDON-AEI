import { describe, expect, test } from 'vitest';
import type { ShaderDefinition, VisionPrompt } from '../types';
import type { ShowBus } from './showBus';
import type { DirectorView } from './showDirector';
import { ShowDirector, VISION_ENERGY_GAIN, withVisionGain } from './showDirector';

const DEFS: ShaderDefinition[] = [{ id: 'hex-core', name: 'Hex', fragmentGlsl: '', uniforms: [] }];

const READ: VisionPrompt = { present: true, coverage: 0.3, motion: 0.6, performerCount: 1, crowdCount: 8 };

describe('withVisionGain', () => {
  test('adds a small motion nudge, clamped to 0-1', () => {
    expect(VISION_ENERGY_GAIN).toBeGreaterThan(0);
    expect(VISION_ENERGY_GAIN).toBeLessThanOrEqual(0.1);
    expect(withVisionGain(0.5, 0)).toBe(0.5);
    expect(withVisionGain(0.5, 1)).toBeCloseTo(0.5 + VISION_ENERGY_GAIN, 9);
    expect(withVisionGain(1, 1)).toBe(1);
    expect(withVisionGain(0, 0)).toBe(0);
  });
});

describe('director vision read', () => {
  test('setVision round-trips through the view, null clears', () => {
    const views: DirectorView[] = [];
    const bus = { post: () => {} } as unknown as ShowBus;
    const d = new ShowDirector({ bus, defs: DEFS, getTheme: () => null, onUpdate: (v) => views.push(v) });
    d.setVision(READ);
    // A view only emits on frame ticks (10 Hz); push one through.
    d.frame(
      {
        bpm: 126, beat: false, onset: false, bass: 0, mid: 0, high: 0, subBass: 0,
        flux: 0, beatConfidence: 0, energy: 0.1, buildUp: false, drop: false, timestamp: 0,
      },
      100000,
    );
    expect(views.length).toBeGreaterThan(0);
    expect(views[views.length - 1].vision).toEqual(READ);
    d.setVision(null);
    d.frame(
      {
        bpm: 126, beat: false, onset: false, bass: 0, mid: 0, high: 0, subBass: 0,
        flux: 0, beatConfidence: 0, energy: 0.1, buildUp: false, drop: false, timestamp: 0,
      },
      101000,
    );
    expect(views[views.length - 1].vision).toBeNull();
  });
});
