// M8 server-side SAM 3.1 segmentation. One Responses call per prompt
// (performer + crowd in parallel); data-URL frames with a /v1/files
// fallback when data URLs are rejected; the official @meta-sam/parser
// reads output_text. Mock returns synthetic grids, zero network.
// Never imported by client code.
import type { SegChannelData, SegResultData } from '../types';
import { parseSamOutput, type ParsedDetections } from '../vision/samParse';
import {
  SEG_GRID_W,
  SEG_MAX_COUNT,
  encodeGrid,
  rasterizeChannel,
  segGridHeight,
} from '../vision/signals';
import { mockCrowdBoxes, mockSegFrame } from '../vision/mockSeg';
import { isLive, metaApiKey } from './config';
import { META_API_BASE } from './metaClient';
import { acquire } from './rateLimiter';
import { stashUsage } from './usage';

export const SAM_MODEL = 'sam-3.1';
export const SAM_TIMEOUT_MS = 4000;
export const PERFORMER_PROMPT = 'performer';
export const PERFORMER_FALLBACK = 'person on stage';
export const CROWD_PROMPT = 'crowd';
export const CROWD_FALLBACK = 'people';

function assertServer() {
  if (typeof window !== 'undefined') throw new Error('sam is server-side only');
}

// Tolerate both response shapes: a bare output_text string or OpenAI-style
// output[].content[] parts. Missing text means zero matches, not an error.
export function extractOutputText(json: unknown): string {
  if (typeof json !== 'object' || json === null) return '';
  const o = json as Record<string, unknown>;
  if (typeof o.output_text === 'string') return o.output_text;
  if (Array.isArray(o.output)) {
    const parts: string[] = [];
    for (const item of o.output) {
      const content = (item as { content?: unknown } | null)?.content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        const part = c as { type?: unknown; text?: unknown };
        if ((part.type === 'output_text' || part.type === 'text') && typeof part.text === 'string') {
          parts.push(part.text);
        }
      }
    }
    if (parts.length > 0) return parts.join('\n');
  }
  return '';
}

interface ResponsesAttempt {
  ok: boolean;
  status: number;
  json: unknown;
  rawError: string;
}

async function postResponses(
  imageRef: string,
  prompt: string,
  key: string,
  timeoutMs: number,
): Promise<ResponsesAttempt> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${META_API_BASE}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: SAM_MODEL,
        input: [
          {
            type: 'message',
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageRef },
            ],
          },
        ],
      }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* raw-text error body */
    }
    return { ok: res.ok, status: res.status, json, rawError: res.ok ? '' : text.slice(0, 300) };
  } catch (err) {
    if (ctrl.signal.aborted) throw new Error(`SAM 3.1 timed out after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeImageRejection(status: number, rawError: string): boolean {
  return status === 400 && /data_?url|image_?url|invalid_image|base64|image content/i.test(rawError);
}

// Best-effort /v1/files upload (multipart, OpenAI-style) for APIs that
// reject inline data URLs. Returns the file id to pass as image_url.
async function uploadFrame(frameDataUrl: string, key: string, timeoutMs: number): Promise<string> {
  const m = /^data:image\/(\w+);base64,(.+)$/.exec(frameDataUrl);
  if (!m) throw new Error('frame is not a base64 image data URL');
  const bytes = Buffer.from(m[2], 'base64');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: `image/${m[1]}` }), 'frame.jpg');
  form.append('purpose', 'vision');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${META_API_BASE}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`frame upload failed: ${res.status}`);
    const json = (await res.json()) as { id?: unknown };
    if (typeof json.id !== 'string' || json.id === '') throw new Error('frame upload returned no id');
    return json.id;
  } catch (err) {
    if (ctrl.signal.aborted) throw new Error(`frame upload timed out after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

interface PromptResult {
  det: ParsedDetections;
  calls: number;
}

// One prompt against one frame. Transport errors fail the tick (the client
// keeps its last good mask); an empty primary retries once with the
// fallback phrasing, and a fallback error keeps the valid empty result.
async function segmentPrompt(
  frameDataUrl: string,
  prompt: string,
  fallback: string,
  frameW: number,
  frameH: number,
  key: string,
  timeoutMs: number,
): Promise<PromptResult> {
  await acquire('meta:sam', 250, 120);
  let imageRef = frameDataUrl;
  let attempt = await postResponses(imageRef, prompt, key, timeoutMs);
  let calls = 1;
  if (!attempt.ok && looksLikeImageRejection(attempt.status, attempt.rawError)) {
    imageRef = await uploadFrame(frameDataUrl, key, timeoutMs);
    attempt = await postResponses(imageRef, prompt, key, timeoutMs);
    calls += 1;
  }
  if (!attempt.ok) throw new Error(`SAM 3.1 failed: ${attempt.status} ${attempt.rawError}`);
  const primary = await parseSamOutput(extractOutputText(attempt.json), frameW, frameH);
  if (primary.count > 0) return { det: primary, calls };
  try {
    await acquire('meta:sam', 250, 120);
    const second = await postResponses(imageRef, fallback, key, timeoutMs);
    calls += 1;
    if (!second.ok) return { det: primary, calls };
    const retry = await parseSamOutput(extractOutputText(second.json), frameW, frameH);
    return { det: retry.count > 0 ? retry : primary, calls };
  } catch {
    return { det: primary, calls };
  }
}

export interface SegFrame {
  dataUrl: string;
  width: number;
  height: number;
}

function toChannel(det: ParsedDetections, gridW: number, gridH: number): SegChannelData {
  const objects = det.objects.slice(0, SEG_MAX_COUNT);
  const grid = rasterizeChannel(
    objects.map((o) => ({ box: o.box, mask: o.mask })),
    gridW,
    gridH,
  );
  return {
    boxes: objects.map((o) => o.box),
    mask: { w: gridW, h: gridH, data: encodeGrid(grid) },
    count: objects.length,
  };
}

export async function segmentFrame(frame: SegFrame, opts?: { timeoutMs?: number }): Promise<SegResultData> {
  assertServer();
  const t0 = Date.now();
  const live = isLive();
  const gridW = SEG_GRID_W;
  const gridH = segGridHeight(frame.width, frame.height);
  if (!live) {
    const mock = mockSegFrame(Date.now() / 1000, gridW, gridH);
    const crowdBoxes = mockCrowdBoxes(Date.now() / 1000);
    stashUsage({
      calls: 2,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      latencyMs: Date.now() - t0,
      mock: true,
      status: 'mock',
    });
    return {
      performer: {
        boxes: [mock.box],
        mask: { w: gridW, h: gridH, data: encodeGrid(mock.perf) },
        count: 1,
      },
      crowd: {
        boxes: crowdBoxes,
        mask: { w: gridW, h: gridH, data: encodeGrid(mock.crowd) },
        count: crowdBoxes.length,
      },
    };
  }
  const key = metaApiKey();
  if (!key) throw new Error('MODEL_API_KEY (or META_API_KEY fallback) is not set');
  const timeoutMs = opts?.timeoutMs ?? SAM_TIMEOUT_MS;
  const [perf, crowd] = await Promise.all([
    segmentPrompt(frame.dataUrl, PERFORMER_PROMPT, PERFORMER_FALLBACK, frame.width, frame.height, key, timeoutMs),
    segmentPrompt(frame.dataUrl, CROWD_PROMPT, CROWD_FALLBACK, frame.width, frame.height, key, timeoutMs),
  ]);
  stashUsage({
    calls: perf.calls + crowd.calls,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    latencyMs: Date.now() - t0,
    mock: false,
    status: 'ok',
  });
  return {
    performer: toChannel(perf.det, gridW, gridH),
    crowd: toChannel(crowd.det, gridW, gridH),
  };
}
