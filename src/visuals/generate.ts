// M7 client-side generation flow: request -> verify each image -> retry
// once -> procedural fallback. Every step logs to the decision log as
// 'image'; cap blocks log as 'cap' like the planner. Verified sets are
// cached per theme (memory + best-effort localStorage) so a reload
// with the same theme never regenerates.
import type { EnergyTag, EventImage, EventTheme, ModelUsage } from '../types';
import { withBasePath } from '../basePath';
import { getCredits, isCapped, recordUsage } from '../director/credit';
import { logDecision } from '../director/decisionLog';
import { eventImageId, themeHash } from './prompts';
import { verifyEventImage } from './verifyImage';
import { renderPaletteGradient } from './fallback';

export function creditBlockReason(): string | null {
  const s = getCredits();
  if (!isCapped(s)) return null;
  if (s.calls >= s.callCap) return `call cap reached (${s.calls}/${s.callCap})`;
  return `token cap reached (${s.inputTokens + s.outputTokens + s.reasoningTokens}/${s.tokenCap})`;
}

function parseUsage(res: Response): ModelUsage {
  try {
    const raw = res.headers.get('x-aei-usage');
    if (raw) return JSON.parse(raw) as ModelUsage;
  } catch {
    /* fall through */
  }
  return { calls: 1, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, latencyMs: 0, mock: false, status: 'unknown' };
}

export interface VisualsResponse {
  images: EventImage[];
  model: string;
}

export async function requestVisuals(theme: EventTheme, tags: EnergyTag[]): Promise<VisualsResponse> {
  const blocked = creditBlockReason();
  if (blocked) throw new Error(`image generation blocked: ${blocked}`);
  const res = await fetch(withBasePath('/api/visuals/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, tags }),
  });
  recordUsage(parseUsage(res));
  if (!res.ok) throw new Error(`visuals request failed: ${res.status}`);
  const data = (await res.json()) as { images: EventImage[] };
  if (!Array.isArray(data.images)) throw new Error('visuals request returned no images');
  return { images: data.images, model: res.headers.get('x-aei-model') ?? '?' };
}

// ---- per-theme cache (memory + localStorage, best-effort) ----

const memory = new Map<string, EventImage[]>();

function cacheKey(theme: EventTheme, tags: EnergyTag[]): string {
  return `aei-visuals:v1:${themeHash(theme)}:${[...tags].sort().join(',')}`;
}

function readStore(key: string): EventImage[] | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EventImage[];
    if (!Array.isArray(parsed) || parsed.some((i) => typeof i?.dataUrl !== 'string')) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStore(key: string, images: EventImage[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(images));
  } catch {
    /* quota or privacy mode: memory cache still holds this session */
  }
}

export function getCachedVisuals(theme: EventTheme, tags: EnergyTag[]): EventImage[] | null {
  const key = cacheKey(theme, tags);
  const mem = memory.get(key);
  if (mem) return mem;
  const stored = readStore(key);
  if (stored) memory.set(key, stored);
  return stored;
}

export function setCachedVisuals(theme: EventTheme, tags: EnergyTag[], images: EventImage[]): void {
  const key = cacheKey(theme, tags);
  memory.set(key, images);
  writeStore(key, images);
}

// ---- full flow ----

function summarize(prompt: string): string {
  return prompt.length > 64 ? `${prompt.slice(0, 64)}…` : prompt;
}

function fallbackImage(theme: EventTheme, tag: EnergyTag, reason: string): EventImage {
  return {
    id: eventImageId(theme, tag),
    prompt: `procedural fallback for ${tag} (${reason})`,
    energyTag: tag,
    dataUrl: renderPaletteGradient(theme.palette, tag),
    source: 'fallback',
  };
}

async function settleOne(
  theme: EventTheme,
  tag: EnergyTag,
  first: EventImage | null,
  model: string,
): Promise<EventImage> {
  const label = first ? summarize(first.prompt) : 'missing image';
  if (first) {
    const check = await verifyEventImage(first.dataUrl, theme.palette);
    logDecision({
      step: 'image',
      model,
      input: `${tag}: ${label}`,
      result: check.ok ? `PASS ${check.width}x${check.height}` : 'FAIL, retrying once',
      verify: { pass: check.ok, reason: check.reason },
      retries: 0,
      latencyMs: null,
    });
    if (check.ok) return first;
  }
  // One retry for this tag, then the procedural gradient.
  try {
    const retry = await requestVisuals(theme, [tag]);
    const cand = retry.images[0] ?? null;
    if (cand) {
      const check = await verifyEventImage(cand.dataUrl, theme.palette);
      logDecision({
        step: 'image',
        model: retry.model,
        input: `${tag}: ${summarize(cand.prompt)}`,
        result: check.ok ? `PASS on retry ${check.width}x${check.height}` : 'FAIL on retry, falling back',
        verify: { pass: check.ok, reason: check.reason },
        retries: 1,
        latencyMs: null,
      });
      if (check.ok) return cand;
    }
  } catch (err) {
    logDecision({
      step: 'image',
      model: 'local',
      input: `${tag}: retry call`,
      result: 'retry failed, falling back',
      verify: { pass: false, reason: err instanceof Error ? err.message : String(err) },
      retries: 1,
      latencyMs: null,
    });
  }
  const fb = fallbackImage(theme, tag, 'verify failed');
  logDecision({
    step: 'image',
    model: 'local',
    input: `${tag}: palette gradient fallback`,
    result: 'fallback applied',
    verify: { pass: true, reason: 'procedural gradient always passes' },
    retries: 1,
    latencyMs: null,
  });
  return fb;
}

export async function generateEventVisuals(
  theme: EventTheme,
  tags: EnergyTag[],
  opts?: { force?: boolean },
): Promise<EventImage[]> {
  const blocked = creditBlockReason();
  if (blocked) {
    logDecision({
      step: 'cap',
      model: 'local',
      input: 'image generation trigger',
      result: `blocked: ${blocked}`,
      verify: null,
      retries: 0,
      latencyMs: null,
    });
    throw new Error(`image generation blocked: ${blocked}`);
  }
  const hit = opts?.force ? null : getCachedVisuals(theme, tags);
  if (hit) {
    logDecision({
      step: 'image',
      model: 'local',
      input: `theme "${theme.eventName}"`,
      result: `cache hit: ${hit.length} visuals restored, no generation`,
      verify: null,
      retries: 0,
      latencyMs: null,
    });
    return hit;
  }
  logDecision({
    step: 'image',
    model: 'local',
    input: `theme "${theme.eventName}" (${tags.join(', ')})`,
    result: `generating ${tags.length} visuals`,
    verify: null,
    retries: 0,
    latencyMs: null,
  });
  const t0 = performance.now();
  const { images, model } = await requestVisuals(theme, tags);
  const byTag = new Map(images.map((i) => [i.energyTag, i]));
  const settled: EventImage[] = [];
  for (const tag of tags) {
    settled.push(await settleOne(theme, tag, byTag.get(tag) ?? null, model));
  }
  setCachedVisuals(theme, tags, settled);
  const sources = settled.map((s) => s.source).join(',');
  logDecision({
    step: 'image',
    model,
    input: `${tags.length} visuals for "${theme.eventName}"`,
    result: `done (${sources})`,
    verify: null,
    retries: 0,
    latencyMs: Math.round(performance.now() - t0),
  });
  return settled;
}
