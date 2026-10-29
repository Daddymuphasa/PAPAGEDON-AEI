// All Meta model entry points. MOCK by default; LIVE calls go through the
// server-side clients with cache + rate limiter. Server-side only.
import type { CrowdSignal, DirectorInput, EventTheme, MusicInsight, ScenePlan } from '../types';
import { cached } from './cache';
import { directorProvider, isLive } from './config';
import { metaCall } from './metaClient';
import { basetenCall } from './basetenClient';
import { mockCrowdSignal, mockInsight, mockPlan, mockTheme } from './mock';

function assertServer() {
  if (typeof window !== 'undefined') throw new Error('meta stubs are server-side only');
}

// M2: flyer -> EventTheme via Muse Spark (vision). Once per event.
export async function extractTheme(flyerDataUrl: string): Promise<EventTheme> {
  assertServer();
  if (!isLive()) return mockTheme;
  return cached('theme', flyerDataUrl, 24 * 3600_000, () =>
    metaCall<EventTheme>('/muse-spark/vision/theme', { image: flyerDataUrl }),
  );
}

// M5: theme-matched texture via Muse Image (shader input). Once per event.
export async function generateTexture(prompt: string): Promise<{ url: string }> {
  assertServer();
  if (!isLive()) return { url: '' };
  return cached('texture', prompt, 24 * 3600_000, () =>
    metaCall<{ url: string }>('/muse-image/generate', { prompt }),
  );
}

// M4: rolling 10-30s chunk -> lyrics/keywords via Muse Voice Transcribe.
export async function transcribeChunk(chunkRef: string): Promise<{ lyrics: string; keywords: string[] }> {
  assertServer();
  if (!isLive()) return { lyrics: '', keywords: mockInsight.keywords };
  return cached('transcribe', chunkRef, 3600_000, () =>
    metaCall<{ lyrics: string; keywords: string[] }>('/muse-voice/transcribe', { chunk: chunkRef }),
  );
}

// M4: chunk summary -> genre/section/mood via Muse Spark.
export async function analyzeMusic(summary: string): Promise<MusicInsight> {
  assertServer();
  if (!isLive()) return mockInsight;
  return cached('analyze', summary, 600_000, () =>
    metaCall<MusicInsight>('/muse-spark/analyze', { summary }),
  );
}

// M5: throttled camera frame -> density/movement via SAM 3.1.
export async function segmentCrowd(frameRef: string): Promise<CrowdSignal> {
  assertServer();
  if (!isLive()) return mockCrowdSignal;
  return cached('crowd', frameRef, 60_000, () =>
    metaCall<CrowdSignal>('/sam-3.1/segment', { frame: frameRef }),
  );
}

// M5: director reasoning. Provider switchable by config: Muse Spark
// (Meta Model API) or Muse Spark Open (Baseten open weights).
export async function planScene(input: DirectorInput): Promise<ScenePlan> {
  assertServer();
  if (!isLive()) return mockPlan(input);
  const key = JSON.stringify({
    t: input.theme,
    s: input.insight?.section,
    g: input.insight?.genre,
    d: input.crowd?.density,
  });
  if (directorProvider() === 'muse-spark-open') {
    return cached('plan-open', key, 30_000, () =>
      basetenCall<ScenePlan>({ prompt: 'Plan the next scene.', input }),
    );
  }
  return cached('plan', key, 30_000, () => metaCall<ScenePlan>('/muse-spark/direct', { input }));
}
