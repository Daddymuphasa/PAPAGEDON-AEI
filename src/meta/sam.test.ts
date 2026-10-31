import { afterEach, describe, expect, test, vi } from 'vitest';
import { takeLastUsage } from './usage';
import { extractOutputText, segmentFrame } from './sam';
import { verifySegResult } from '../vision/signals';

const ONE_OBJECT =
  '<0f>0<|box;x1=64;y1=48;x2=127;y2=95;w=640;h=480|>' +
  "<|mask;x=0;y=0;data=4,4,!!!!!'uJrc07V|>\n";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  takeLastUsage();
});

describe('extractOutputText', () => {
  test('reads bare and nested shapes, defaults to empty', () => {
    expect(extractOutputText({ output_text: 'abc' })).toBe('abc');
    expect(
      extractOutputText({ output: [{ content: [{ type: 'output_text', text: 'x' }, { type: 'text', text: 'y' }] }] }),
    ).toBe('x\ny');
    expect(extractOutputText({})).toBe('');
    expect(extractOutputText(null)).toBe('');
  });
});

describe('segmentFrame', () => {
  test('mock returns verified grids, zero network', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: unknown) => {
      calls.push(String(url));
      return jsonResponse({});
    });
    const r = await segmentFrame({ dataUrl: 'data:image/jpeg;base64,xx', width: 640, height: 480 });
    expect(verifySegResult(r)).toEqual({ ok: true, errors: [] });
    expect(r.performer.mask.w).toBe(128);
    expect(r.performer.mask.h).toBe(96);
    expect(r.performer.count).toBe(1);
    expect(r.crowd.count).toBe(r.crowd.boxes.length);
    expect(calls).toEqual([]);
    expect(takeLastUsage()).toMatchObject({ calls: 2, mock: true });
  });

  test('live falls back to alternate phrasing on empty results', async () => {
    vi.stubEnv('AEI_LIVE', 'true');
    vi.stubEnv('MODEL_API_KEY', 'test-key');
    const seen: string[] = [];
    vi.stubGlobal('fetch', async (_url: unknown, init?: { body?: unknown }) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        input?: { content?: { type?: string; text?: string }[] }[];
      };
      const prompt = body.input?.[0]?.content?.find((c) => c.type === 'input_text')?.text ?? '';
      seen.push(prompt);
      const text = prompt === 'performer' || prompt === 'people' ? ONE_OBJECT : '';
      return jsonResponse({ output_text: text });
    });
    const r = await segmentFrame({ dataUrl: 'data:image/jpeg;base64,xx', width: 640, height: 480 });
    expect(r.performer.count).toBe(1);
    expect(r.crowd.count).toBe(1); // 'crowd' empty -> 'people' hit
    expect(seen.sort()).toEqual(['crowd', 'people', 'performer']);
    expect(takeLastUsage()).toMatchObject({ calls: 3, mock: false });
  });

  test('data-URL rejection uploads the frame and retries with the file id', async () => {
    vi.stubEnv('AEI_LIVE', 'true');
    vi.stubEnv('MODEL_API_KEY', 'test-key');
    const imageRefs: string[] = [];
    vi.stubGlobal('fetch', async (url: unknown, init?: { body?: unknown }) => {
      const u = String(url);
      if (u.endsWith('/v1/files')) return jsonResponse({ id: 'file_9' });
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        input?: { content?: { type?: string; image_url?: string }[] }[];
      };
      const ref = body.input?.[0]?.content?.find((c) => c.type === 'input_image')?.image_url ?? '';
      imageRefs.push(ref);
      if (ref.startsWith('data:')) return jsonResponse({ error: 'invalid data_url' }, 400);
      return jsonResponse({ output_text: ONE_OBJECT });
    });
    const frame = `data:image/jpeg;base64,${Buffer.from('fake-bytes').toString('base64')}`;
    const r = await segmentFrame({ dataUrl: frame, width: 640, height: 480 });
    expect(r.performer.count).toBe(1);
    expect(r.crowd.count).toBe(1);
    expect(imageRefs.filter((r) => r === 'file_9').length).toBe(2);
  });

  test('an upstream timeout fails fast', async () => {
    vi.stubEnv('AEI_LIVE', 'true');
    vi.stubEnv('MODEL_API_KEY', 'test-key');
    vi.stubGlobal('fetch', (_url: unknown, init?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('This operation was aborted')));
      });
    });
    await expect(segmentFrame({ dataUrl: 'data:image/jpeg;base64,xx', width: 640, height: 480 }, { timeoutMs: 20 })).rejects.toThrow(
      /timed out/,
    );
  });

  test('a primary error fails the tick (client keeps last good)', async () => {
    vi.stubEnv('AEI_LIVE', 'true');
    vi.stubEnv('MODEL_API_KEY', 'test-key');
    vi.stubGlobal('fetch', async () => jsonResponse({ error: 'boom' }, 500));
    await expect(segmentFrame({ dataUrl: 'data:image/jpeg;base64,xx', width: 640, height: 480 })).rejects.toThrow(
      /SAM 3.1 failed: 500/,
    );
  });
});
