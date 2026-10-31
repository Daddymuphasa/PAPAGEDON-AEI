import { describe, expect, test } from 'vitest';
import { audioStateLabel, resumeAudioContext, type ResumableContext } from './audioContext';

function fake(state: string, resumeImpl?: () => Promise<unknown> | void): { state: string; calls: number; resume(): Promise<void> } {
  const f = {
    state,
    calls: 0,
    async resume() {
      f.calls += 1;
      await resumeImpl?.();
    },
  };
  return f;
}

describe('resumeAudioContext', () => {
  test('passes running contexts through untouched', async () => {
    const ctx = fake('running');
    expect(await resumeAudioContext(ctx)).toBe('running');
    expect(ctx.calls).toBe(0);
  });

  test('resolves on the first resume', async () => {
    const ctx = fake('suspended', () => {
      ctx.state = 'running';
    });
    expect(await resumeAudioContext(ctx)).toBe('running');
    expect(ctx.calls).toBe(1);
  });

  test('retries once, then reports suspended', async () => {
    const ctx = fake('suspended');
    expect(await resumeAudioContext(ctx)).toBe('suspended');
    expect(ctx.calls).toBe(2);
  });

  test('a throwing resume still retries', async () => {
    let n = 0;
    const ctx = fake('suspended', () => {
      n += 1;
      if (n === 1) throw new Error('no gesture');
      ctx.state = 'running';
    });
    expect(await resumeAudioContext(ctx)).toBe('running');
    expect(ctx.calls).toBe(2);
  });

  test('missing and closed contexts short-circuit', async () => {
    expect(await resumeAudioContext(null)).toBe('missing');
    const ctx = fake('closed');
    expect(await resumeAudioContext(ctx)).toBe('closed');
    expect(ctx.calls).toBe(0);
  });
});

describe('audioStateLabel', () => {
  test('maps every state to text + tone', () => {
    expect(audioStateLabel('running')).toEqual({ text: 'Audio Running', tone: 'ok' });
    expect(audioStateLabel('suspended').tone).toBe('warn');
    expect(audioStateLabel('closed').tone).toBe('warn');
    expect(audioStateLabel('missing').tone).toBe('muted');
  });
});
