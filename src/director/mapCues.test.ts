import { beforeEach, describe, expect, test } from 'vitest';
import type { AudioFeatures, ShaderDefinition } from '../types';
import type { DirectorView } from './showDirector';
import { ShowDirector } from './showDirector';
import type { ShowBus } from './showBus';
import { clearDecisions, getDecisions } from './decisionLog';
import { mockTrackMap } from './trackMap';

const DEFS: ShaderDefinition[] = [{ id: 'hex-core', name: 'Hex', fragmentGlsl: '', uniforms: [] }];

function flatFeatures(): AudioFeatures {
  return {
    bpm: 126,
    beat: false,
    onset: false,
    bass: 0.5,
    mid: 0.5,
    high: 0.5,
    subBass: 0.5,
    flux: 0,
    beatConfidence: 0,
    energy: 0.5,
    buildUp: false,
    drop: false,
    timestamp: 0,
  };
}

function makeDirector(views: DirectorView[]): ShowDirector {
  const bus = { post: () => {} } as unknown as ShowBus;
  return new ShowDirector({ bus, defs: DEFS, getTheme: () => null, onUpdate: (v) => views.push(v) });
}

// Drive the director from track t=20s to t=35s in 0.15s steps (every
// step trips the 100ms view throttle). The mock map's first drop starts
// at t=32s, so the pre-cue window is [30, 32).
function drive(d: ShowDirector, t0: number): number[] {
  const ts: number[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = 20 + i * 0.15;
    ts.push(t);
    d.frame(flatFeatures(), t0 + t * 1000);
  }
  return ts;
}

describe('map pre-cues', () => {
  beforeEach(() => clearDecisions());

  test('pre-cues ~2s before a mapped drop, holds intensity, hits on the drop', () => {
    const views: DirectorView[] = [];
    const d = makeDirector(views);
    const t0 = 100000;
    d.setAudio('file', 126, t0, 'test.mp3');
    d.setTrackMap(mockTrackMap());
    const ts = drive(d, t0);
    expect(views.length).toBe(ts.length);

    const mapLogs = getDecisions().filter((e) => e.step === 'map');
    expect(mapLogs.filter((e) => e.result.includes('pre-cue'))).toHaveLength(1);
    expect(mapLogs.filter((e) => e.result.includes('map hit'))).toHaveLength(1);

    const prepMin = Math.min(
      ...views.filter((_, i) => ts[i] >= 30 && ts[i] < 32).map((v) => v.live.intensity),
    );
    expect(prepMin).toBeLessThan(0.65);
  });

  test('second mapped drop pre-cues again after the first', () => {
    const views: DirectorView[] = [];
    const d = makeDirector(views);
    const t0 = 200000;
    d.setAudio('file', 126, t0, 'test.mp3');
    d.setTrackMap(mockTrackMap());
    // Through both mock drops (32s and 96s).
    for (let i = 0; i <= 520; i++) {
      const t = 20 + i * 0.15;
      d.frame(flatFeatures(), t0 + t * 1000);
    }
    const cues = getDecisions().filter((e) => e.step === 'map' && e.result.includes('pre-cue'));
    expect(cues).toHaveLength(2);
  });

  test('silent without a map: no map logs, intensity untouched', () => {
    const views: DirectorView[] = [];
    const d = makeDirector(views);
    const t0 = 300000;
    d.setAudio('file', 126, t0, 'test.mp3');
    drive(d, t0);
    expect(getDecisions().some((e) => e.step === 'map')).toBe(false);
    expect(views.length).toBeGreaterThan(0);
    for (const v of views) expect(v.live.intensity).toBe(0.7);
  });

  test('silent on mic even with a map attached', () => {
    const views: DirectorView[] = [];
    const d = makeDirector(views);
    const t0 = 400000;
    d.setAudio('mic', 126, t0, null);
    d.setTrackMap(mockTrackMap());
    drive(d, t0);
    expect(getDecisions().some((e) => e.step === 'map')).toBe(false);
  });
});
