import { describe, expect, test } from 'vitest';
import { cameraErrorMessage, waitForFrames } from './cameraStatus';

describe('cameraErrorMessage', () => {
  test('maps known errors to plain instructions', () => {
    expect(cameraErrorMessage('NotAllowedError')).toContain('choose Allow');
    expect(cameraErrorMessage('NotFoundError')).toContain('No camera found');
    expect(cameraErrorMessage('NotReadableError')).toContain('busy');
    expect(cameraErrorMessage('SecurityError')).toContain('localhost or HTTPS');
    expect(cameraErrorMessage('AbortError')).toContain('Try again');
    expect(cameraErrorMessage('NoFrames')).toContain('no picture');
    expect(cameraErrorMessage(undefined)).toContain('Chrome or Edge');
  });

  test('unknown errors keep their name for the log', () => {
    expect(cameraErrorMessage('WeirdError', 'boom')).toBe('Camera error (WeirdError: boom) — Try again.');
  });
});

describe('waitForFrames', () => {
  test('resolves fast when frames flow', async () => {
    await expect(waitForFrames(() => true, 1000, 10)).resolves.toBe(true);
    let n = 0;
    await expect(
      waitForFrames(() => ++n >= 3, 1000, 10),
    ).resolves.toBe(true);
    expect(n).toBe(3);
  });

  test('times out when nothing arrives', async () => {
    await expect(waitForFrames(() => false, 40, 10)).resolves.toBe(false);
    await expect(
      waitForFrames(() => {
        throw new Error('no video');
      }, 40, 10),
    ).resolves.toBe(false);
  });
});
