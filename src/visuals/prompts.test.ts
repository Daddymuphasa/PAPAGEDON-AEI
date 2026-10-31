import { describe, expect, test } from 'vitest';
import { mockTheme } from '../meta/mock';
import {
  DEFAULT_IMAGE_COUNT,
  ENERGY_TAGS,
  buildImagePrompt,
  eventImageId,
  tagsForCount,
  themeHash,
} from './prompts';

describe('buildImagePrompt', () => {
  test('carries the theme identity', () => {
    const p = buildImagePrompt(mockTheme, 'peak');
    expect(p).toContain(mockTheme.eventName);
    expect(p).toContain(mockTheme.genre);
    expect(p).toContain(mockTheme.mood);
    for (const c of mockTheme.palette) expect(p).toContain(c);
    for (const m of mockTheme.motifs) expect(p).toContain(m);
  });

  test('asks for projector-friendly abstract art with no readable content', () => {
    const p = buildImagePrompt(mockTheme, 'calm');
    for (const word of ['Abstract', 'loopable', 'no text', 'no logos', 'no faces']) {
      expect(p).toContain(word);
    }
  });

  test('differs per energy tag', () => {
    const prompts = ENERGY_TAGS.map((t) => buildImagePrompt(mockTheme, t));
    expect(new Set(prompts).size).toBe(4);
    expect(prompts[0]).toContain('calm');
    expect(prompts[2]).toContain('peak');
    expect(prompts[3]).toContain('drop');
  });
});

describe('themeHash / eventImageId', () => {
  test('is stable and theme-sensitive', () => {
    expect(themeHash(mockTheme)).toBe(themeHash(mockTheme));
    expect(themeHash({ ...mockTheme, mood: 'melancholy' })).not.toBe(themeHash(mockTheme));
  });

  test('ids are unique per tag', () => {
    const ids = ENERGY_TAGS.map((t) => eventImageId(mockTheme, t));
    expect(new Set(ids).size).toBe(4);
    expect(ids[0]).toContain('calm');
  });
});

describe('tagsForCount', () => {
  test('defaults to one tag per energy level', () => {
    expect(tagsForCount(DEFAULT_IMAGE_COUNT)).toEqual(['calm', 'build', 'peak', 'drop']);
  });

  test('cycles tags for larger counts and clamps junk', () => {
    expect(tagsForCount(6)).toEqual(['calm', 'build', 'peak', 'drop', 'calm', 'build']);
    expect(tagsForCount(0)).toEqual(['calm']);
  });
});
