import { describe, expect, test } from 'vitest';
import type { TextureMeta } from '../types';
import { ARC_TEXTURE, DEFAULT_TEX_MIX, pickTextureForPlan, pickTextureForTag } from './texturePick';

const IMAGES: TextureMeta[] = [
  { id: 'evt-calm-h', energyTag: 'calm', enabled: true },
  { id: 'evt-build-h', energyTag: 'build', enabled: true },
  { id: 'evt-peak-h', energyTag: 'peak', enabled: true },
  { id: 'evt-drop-h', energyTag: 'drop', enabled: true },
];

describe('pickTextureForTag', () => {
  test('matches the energy tag', () => {
    expect(pickTextureForTag('peak', IMAGES)).toBe('evt-peak-h');
    expect(pickTextureForTag('drop', IMAGES)).toBe('evt-drop-h');
  });

  test('skips disabled images, then any enabled one', () => {
    const off = IMAGES.map((i) => (i.energyTag === 'peak' ? { ...i, enabled: false } : i));
    expect(pickTextureForTag('peak', off)).toBe('evt-calm-h');
  });

  test('returns null with nothing enabled', () => {
    expect(pickTextureForTag('peak', IMAGES.map((i) => ({ ...i, enabled: false })))).toBeNull();
    expect(pickTextureForTag('peak', [])).toBeNull();
  });
});

describe('pickTextureForPlan', () => {
  test('honours a valid plan texture + mix', () => {
    expect(pickTextureForPlan('evt-drop-h', 0.8, IMAGES, 'build')).toEqual({ id: 'evt-drop-h', texMix: 0.8 });
  });

  test('falls back to the arc tag on unknown, disabled, or missing ids', () => {
    expect(pickTextureForPlan('ghost', 0.5, IMAGES, 'peak')).toEqual({ id: 'evt-peak-h', texMix: 0.5 });
    const off = IMAGES.map((i) => (i.id === 'evt-drop-h' ? { ...i, enabled: false } : i));
    expect(pickTextureForPlan('evt-drop-h', 0.5, off, 'peak')).toEqual({ id: 'evt-peak-h', texMix: 0.5 });
    expect(pickTextureForPlan(undefined, undefined, IMAGES, 'breakdown')).toEqual({
      id: 'evt-calm-h',
      texMix: DEFAULT_TEX_MIX,
    });
    expect(pickTextureForPlan(null, null, IMAGES, 'build')).toEqual({
      id: 'evt-build-h',
      texMix: DEFAULT_TEX_MIX,
    });
  });

  test('clamps junk mixes to the default', () => {
    expect(pickTextureForPlan('evt-peak-h', 9, IMAGES, 'peak')).toEqual({
      id: 'evt-peak-h',
      texMix: DEFAULT_TEX_MIX,
    });
    expect(pickTextureForPlan('evt-peak-h', 'loud', IMAGES, 'peak').texMix).toBe(DEFAULT_TEX_MIX);
  });

  test('every arc maps to a real tag', () => {
    for (const arc of Object.keys(ARC_TEXTURE)) {
      expect(pickTextureForTag(ARC_TEXTURE[arc as keyof typeof ARC_TEXTURE], IMAGES)).not.toBeNull();
    }
  });
});
