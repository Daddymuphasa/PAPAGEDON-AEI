// M8 client vision tick: frame -> /api/vision/segment -> verify ->
// signals -> smooth. Cap blocks throw before any network; route and
// payload failures throw so the page keeps its last good mask.
// Client-only (fetch + performance), but import-safe in Node for tests.
import type { ModelUsage, NormBox, SegResultData, VisionSignals } from '../types';
import { withBasePath } from '../basePath';
import { getCredits, isCapped, recordUsage } from '../director/credit';
import {
  SEG_SMOOTH_ALPHA,
  coverageOf,
  decodeGrid,
  motionBetween,
  smoothBox,
  smoothValue,
  verifySegResult,
} from './signals';

export function visionBlockReason(): string | null {
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

export function largestBox(boxes: NormBox[]): NormBox | null {
  let best: NormBox | null = null;
  let bestArea = 0;
  for (const b of boxes) {
    const area = (b.x1 - b.x0) * (b.y1 - b.y0);
    if (area > bestArea) {
      bestArea = area;
      best = b;
    }
  }
  return best;
}

export interface SegTick {
  result: SegResultData;
  signals: VisionSignals;
  model: string;
  latencyMs: number;
}

export class VisionTickState {
  private prevCrowd: Uint8Array | null = null;
  private box: NormBox | null = null;
  private presence = 0;
  private coverage = 0;
  private motion = 0;

  reset(): void {
    this.prevCrowd = null;
    this.box = null;
    this.presence = 0;
    this.coverage = 0;
    this.motion = 0;
  }

  async tick(frameDataUrl: string, frameW: number, frameH: number): Promise<SegTick> {
    const blocked = visionBlockReason();
    if (blocked) throw new Error(`segmentation blocked: ${blocked}`);
    const t0 = performance.now();
    const res = await fetch(withBasePath('/api/vision/segment'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: frameDataUrl, width: frameW, height: frameH }),
    });
    recordUsage(parseUsage(res));
    if (!res.ok) throw new Error(`segment request failed: ${res.status}`);
    const data = (await res.json()) as SegResultData;
    const check = verifySegResult(data);
    if (!check.ok) throw new Error(`segment result invalid: ${check.errors[0]}`);
    const crowdGrid = decodeGrid(data.crowd.mask.data, data.crowd.mask.w, data.crowd.mask.h);
    if (!crowdGrid) throw new Error('segment result invalid: crowd grid undecodable');
    const rawCoverage = coverageOf(crowdGrid);
    const rawMotion = this.prevCrowd === null ? 0 : motionBetween(this.prevCrowd, crowdGrid);
    this.prevCrowd = crowdGrid;
    this.presence = smoothValue(this.presence, data.performer.count > 0 ? 1 : 0, SEG_SMOOTH_ALPHA);
    this.coverage = smoothValue(this.coverage, rawCoverage, SEG_SMOOTH_ALPHA);
    this.motion = smoothValue(this.motion, rawMotion, SEG_SMOOTH_ALPHA);
    this.box = smoothBox(this.box, largestBox(data.performer.boxes), SEG_SMOOTH_ALPHA);
    return {
      result: data,
      signals: {
        performerBox: this.box === null ? null : { ...this.box },
        performerPresent: this.presence >= 0.5,
        crowdCoverage: this.coverage,
        crowdMotion: this.motion,
        performerCount: data.performer.count,
        crowdCount: data.crowd.count,
      },
      model: res.headers.get('x-aei-model') ?? '?',
      latencyMs: Math.round(performance.now() - t0),
    };
  }
}
