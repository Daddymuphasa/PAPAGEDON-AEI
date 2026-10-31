// M7 server-side Muse Image caller. One images/generations call per
// energy level, cached per theme+tag. Mock returns procedural palette
// art with no network. Never imported by client code.
import type { EnergyTag, EventImage, EventTheme } from '../types';
import { buildImagePrompt, eventImageId, themeHash } from '../visuals/prompts';
import { mockImageDataUrl } from '../visuals/mockArt';
import { cached } from './cache';
import { isLive, metaApiKey } from './config';
import { acquire } from './rateLimiter';
import { stashUsage } from './usage';
import { META_API_BASE, MUSE_IMAGE_MODEL } from './metaClient';

export const IMAGE_SIZE = '1792x1024';
export const IMAGE_OUTPUT_FORMAT = 'webp';
const IMAGE_TIMEOUT_MS = 90_000;

interface ImagesResponse {
  data?: { b64_json?: string; url?: string }[];
}

function assertServer() {
  if (typeof window !== 'undefined') throw new Error('museImage is server-side only');
}

// One live generation. Returns the raw base64 payload (no data: prefix).
async function liveImage(prompt: string): Promise<string> {
  assertServer();
  if (!isLive()) throw new Error('liveImage requires AEI_LIVE=true');
  const key = metaApiKey();
  if (!key) throw new Error('MODEL_API_KEY (or META_API_KEY fallback) is not set');
  await acquire('meta:images', 2000, 10);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(`${META_API_BASE}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MUSE_IMAGE_MODEL,
        prompt,
        n: 1,
        size: IMAGE_SIZE,
        response_format: 'b64_json',
        output_format: IMAGE_OUTPUT_FORMAT,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Muse Image failed: ${res.status}`);
    const body = (await res.json()) as ImagesResponse;
    const b64 = body.data?.[0]?.b64_json;
    if (!b64) throw new Error('Muse Image returned no image data');
    return b64;
  } finally {
    clearTimeout(timer);
  }
}

async function liveEventImage(theme: EventTheme, tag: EnergyTag): Promise<EventImage> {
  const prompt = buildImagePrompt(theme, tag);
  const b64 = await cached('event-image', `${themeHash(theme)}:${tag}:${prompt}`, 24 * 3600_000, () =>
    liveImage(prompt),
  );
  return {
    id: eventImageId(theme, tag),
    prompt,
    energyTag: tag,
    dataUrl: `data:image/${IMAGE_OUTPUT_FORMAT};base64,${b64}`,
    source: 'live',
  };
}

function mockEventImage(theme: EventTheme, tag: EnergyTag): EventImage {
  return {
    id: eventImageId(theme, tag),
    prompt: buildImagePrompt(theme, tag),
    energyTag: tag,
    dataUrl: mockImageDataUrl(theme.palette, tag),
    source: 'mock',
  };
}

// Generate one image per tag (default: calm/build/peak/drop). Stashes one
// aggregated usage entry so the credit guard counts every image call.
export async function generateEventImages(theme: EventTheme, tags: EnergyTag[]): Promise<EventImage[]> {
  assertServer();
  const t0 = Date.now();
  const live = isLive();
  const images: EventImage[] = [];
  for (const tag of tags) {
    images.push(live ? await liveEventImage(theme, tag) : mockEventImage(theme, tag));
  }
  stashUsage({
    calls: images.length,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    latencyMs: Date.now() - t0,
    mock: !live,
    status: live ? 'ok' : 'mock',
  });
  return images;
}
