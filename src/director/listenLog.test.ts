import { beforeEach, describe, expect, test } from 'vitest';
import type { AudioFeatures, ShaderDefinition } from '../types';
import type { DirectorView } from './showDirector';
import { ShowDirector } from './showDirector';
import { clearDecisions, getDecisions } from './decisionLog';

const DEFS: ShaderDefinition[] = [{ id: 'SignaturePack/01_aurora', name: 'Aurora', fragmentGlsl: '', uniforms: [] }];

function roomFeatures(): AudioFeatures {
  return {
    bpm: 126,
    beat: false,
    onset: false,
    bass: 0.7,
    mid: 0.3,
    high: 0.2,
    subBass: 0.5,
    flux: 0.005,
    beatConfidence: 0,
    energy: 0.55,
    buildUp: false,
    drop: false,
    timestamp: 0,
  };
}

describe('listening profile cadence', () => {
  beforeEach(() => clearDecisions());

  test('locks a profile after ~4s and logs label changes once', () => {
    const views: DirectorView[] = [];
    const d = new ShowDirector({ onScene: () => {}, defs: DEFS, getTheme: () => null, onUpdate: (v) => views.push(v) });
    const t0 = 100000;
    d.setAudio('file', 126, t0, 'room.mp3');
    for (let ms = 0; ms <= 9000; ms += 150) {
      d.frame(roomFeatures(), t0 + ms);
    }
    const listenLogs = getDecisions().filter((e) => e.step === 'listen');
    expect(listenLogs).toHaveLength(1);
    expect(listenLogs[0].result).toContain('house/techno');
    const last = views[views.length - 1];
    expect(last.profile).not.toBe(null);
    expect(last.profile?.label).toBe('house/techno');
    expect(last.profile?.bpm).toBe(126);
  });

  test('no profile and no listen logs before the first window closes', () => {
    const views: DirectorView[] = [];
    const d = new ShowDirector({ onScene: () => {}, defs: DEFS, getTheme: () => null, onUpdate: (v) => views.push(v) });
    const t0 = 200000;
    d.setAudio('file', 126, t0, 'room.mp3');
    for (let ms = 0; ms <= 2000; ms += 150) {
      d.frame(roomFeatures(), t0 + ms);
    }
    expect(getDecisions().some((e) => e.step === 'listen')).toBe(false);
    expect(views[views.length - 1].profile).toBe(null);
  });
});
