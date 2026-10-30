import { describe, expect, test } from 'vitest';
import type { TrackMap } from '../types';
import { mockTrackMap, upcoming, upcomingList, verifyTrackMap } from './trackMap';

function goodMap(): TrackMap {
  return {
    durationS: 100,
    bpm: 128,
    beats: [0, 0.5, 1, 1.5, 2],
    downbeats: [0, 2],
    energy: [
      { t: 0, v: 0.2 },
      { t: 0.5, v: 0.5 },
      { t: 1, v: 0.9 },
    ],
    sections: [
      { start: 0, end: 30, kind: 'intro' },
      { start: 30, end: 60, kind: 'build' },
      { start: 60, end: 100, kind: 'drop' },
    ],
  };
}

describe('verifyTrackMap', () => {
  test('accepts a well-formed map', () => {
    const r = verifyTrackMap(goodMap());
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  test('accepts the deterministic mock map', () => {
    const r = verifyTrackMap(mockTrackMap());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  test('rejects non-objects and bad duration/bpm', () => {
    expect(verifyTrackMap(null).ok).toBe(false);
    expect(verifyTrackMap({ ...goodMap(), durationS: 0 }).ok).toBe(false);
    expect(verifyTrackMap({ ...goodMap(), bpm: 30 }).ok).toBe(false);
    expect(verifyTrackMap({ ...goodMap(), bpm: 300 }).ok).toBe(false);
  });

  test('rejects unordered or out-of-range beats', () => {
    expect(verifyTrackMap({ ...goodMap(), beats: [0, 2, 1] }).ok).toBe(false);
    expect(verifyTrackMap({ ...goodMap(), beats: [0, 101] }).ok).toBe(false);
    expect(verifyTrackMap({ ...goodMap(), downbeats: 'x' }).ok).toBe(false);
  });

  test('rejects bad energy points', () => {
    expect(verifyTrackMap({ ...goodMap(), energy: [{ t: 0, v: 1.5 }] }).ok).toBe(false);
    expect(verifyTrackMap({ ...goodMap(), energy: [{ t: 101, v: 0.5 }] }).ok).toBe(false);
    expect(
      verifyTrackMap({
        ...goodMap(),
        energy: [
          { t: 1, v: 0.5 },
          { t: 0.5, v: 0.5 },
        ],
      }).ok,
    ).toBe(false);
  });

  test('rejects bad kinds, gaps and overlaps in sections', () => {
    const m = goodMap();
    expect(
      verifyTrackMap({ ...m, sections: [{ start: 0, end: 100, kind: 'unknown' }] }).ok,
    ).toBe(false);
    expect(
      verifyTrackMap({
        ...m,
        sections: [
          { start: 0, end: 30, kind: 'intro' },
          { start: 40, end: 100, kind: 'drop' },
        ],
      }).ok,
    ).toBe(false);
    expect(
      verifyTrackMap({
        ...m,
        sections: [
          { start: 0, end: 50, kind: 'intro' },
          { start: 40, end: 100, kind: 'drop' },
        ],
      }).ok,
    ).toBe(false);
    expect(verifyTrackMap({ ...m, sections: [] }).ok).toBe(false);
  });
});

describe('upcoming', () => {
  const sections = goodMap().sections;

  test('returns the next change inside the lookahead', () => {
    expect(upcoming(sections, 29, 2)).toEqual({ at: 30, from: 'intro', to: 'build', inS: 1 });
  });

  test('returns null when the next change is too far or past', () => {
    expect(upcoming(sections, 10, 2)).toBe(null);
    expect(upcoming(sections, 100, 30)).toBe(null);
    expect(upcoming([], 10, 30)).toBe(null);
  });

  test('upcomingList returns the next few changes in order', () => {
    expect(upcomingList(sections, 10, 3, 120)).toEqual([
      { at: 30, from: 'intro', to: 'build', inS: 20 },
      { at: 60, from: 'build', to: 'drop', inS: 50 },
    ]);
    expect(upcomingList(sections, 10, 3, 25)).toEqual([
      { at: 30, from: 'intro', to: 'build', inS: 20 },
    ]);
  });
});

describe('mockTrackMap', () => {
  test('is deterministic and spans two drops', () => {
    const a = mockTrackMap();
    const b = mockTrackMap();
    expect(a).toEqual(b);
    expect(a.sections.filter((s) => s.kind === 'drop')).toHaveLength(2);
    expect(a.sections[0].start).toBe(0);
    expect(a.sections[a.sections.length - 1].end).toBe(a.durationS);
  });
});
