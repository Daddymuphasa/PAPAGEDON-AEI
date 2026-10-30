import { describe, expect, test } from 'vitest';
import { BeatLatch, FEAT_TIMEOUT_MS, isFeatPacket, isStreamStale } from './featureStream';

function packet(over: Record<string, unknown> = {}) {
  return {
    t: 'feat',
    seq: 1,
    ts: 1000,
    bass: 0.5,
    subBass: 0.4,
    mid: 0.3,
    high: 0.2,
    energy: 0.4,
    flux: 0.01,
    beat: false,
    beatConfidence: 0,
    bpm: 126,
    buildUp: false,
    drop: false,
    ...over,
  };
}

describe('feature stream', () => {
  test('accepts a well-formed packet', () => {
    expect(isFeatPacket(packet())).toBe(true);
  });

  test('rejects malformed packets', () => {
    expect(isFeatPacket(null)).toBe(false);
    expect(isFeatPacket({ t: 'feat' })).toBe(false);
    expect(isFeatPacket(packet({ t: 'hit' }))).toBe(false);
    expect(isFeatPacket(packet({ bass: 'loud' }))).toBe(false);
    expect(isFeatPacket(packet({ beat: 1 }))).toBe(false);
    const { drop, ...noDrop } = packet();
    void drop;
    expect(isFeatPacket(noDrop)).toBe(false);
  });

  test('a beat between frames renders exactly once', () => {
    const latch = new BeatLatch();
    latch.push(7, true);
    expect(latch.take()).toBe(true);
    expect(latch.take()).toBe(false);
    expect(latch.take()).toBe(false);
  });

  test('duplicate beat packets do not double-fire', () => {
    const latch = new BeatLatch();
    latch.push(7, true);
    latch.push(7, true);
    expect(latch.take()).toBe(true);
    expect(latch.take()).toBe(false);
  });

  test('non-beat packets never fire', () => {
    const latch = new BeatLatch();
    latch.push(7, false);
    latch.push(8, false);
    expect(latch.take()).toBe(false);
  });

  test('two queued beats consume across two frames', () => {
    const latch = new BeatLatch();
    latch.push(7, true);
    latch.push(8, true);
    expect(latch.take()).toBe(true);
    expect(latch.take()).toBe(true);
    expect(latch.take()).toBe(false);
  });

  test('staleness switches to mock and back', () => {
    expect(isStreamStale(null, 1000)).toBe(true);
    expect(isStreamStale(900, 1000)).toBe(false);
    expect(isStreamStale(1000 - FEAT_TIMEOUT_MS - 1, 1000)).toBe(true);
    expect(isStreamStale(1000, 1000)).toBe(false);
  });
});
