// M8 SAM output wrapper: non-streaming Responses output_text -> typed
// detections via the official @meta-sam/parser. Empty output_text is a
// valid zero-match result, never an error. Node-safe (server + tests).
import {
  decodeMaskToRaster,
  parseImageStream,
  recordsOfKind,
  type ResponsesEvent,
  type SegmentationMaskRecord,
} from '@meta-sam/parser';
import type { NormBox } from '../types';

export interface ParsedObject {
  box: NormBox;
  mask: { raster: Uint8Array; w: number; h: number } | null;
  objectId: string;
  confidence?: number;
}

export interface ParsedDetections {
  objects: ParsedObject[];
  count: number;
  diagnostics: string[];
}

async function* syntheticEvents(text: string): AsyncGenerator<ResponsesEvent> {
  yield { type: 'response.output_text.done', item_id: 'sam-1', output_index: 0, content_index: 0, text };
  yield { type: 'response.completed' };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export async function parseSamOutput(
  outputText: string,
  frameW: number,
  frameH: number,
): Promise<ParsedDetections> {
  if (outputText.trim() === '') return { objects: [], count: 0, diagnostics: [] };
  const w = frameW > 0 ? frameW : 1;
  const h = frameH > 0 ? frameH : 1;
  try {
    const parsed = parseImageStream(syntheticEvents(outputText));
    for await (const _snap of parsed) {
      /* drain: the parsed result lands in finalResult */
    }
    const res = await parsed.finalResult;
    const diagnostics = res.diagnostics.slice(0, 4).map((d) => `${d.code}: ${d.message}`);
    if (res.outcome.status !== 'completed') diagnostics.unshift(`outcome: ${res.outcome.status}`);
    const masksById = new Map<string, SegmentationMaskRecord>();
    for (const m of recordsOfKind(res.records, 'mask')) {
      if (!masksById.has(m.objectId)) masksById.set(m.objectId, m);
    }
    const objects: ParsedObject[] = [];
    for (const b of recordsOfKind(res.records, 'box')) {
      const box: NormBox = {
        x0: clamp01(b.left / w),
        y0: clamp01(b.top / h),
        x1: clamp01(b.right / w),
        y1: clamp01(b.bottom / h),
      };
      if (b.confidence !== undefined) box.confidence = b.confidence;
      if (!(box.x1 > box.x0 && box.y1 > box.y0)) continue;
      let mask: ParsedObject['mask'] = null;
      const mr = masksById.get(b.objectId);
      if (mr) {
        try {
          mask = { raster: decodeMaskToRaster(mr.mask), w: mr.mask.width, h: mr.mask.height };
        } catch {
          diagnostics.push(`mask-decode: object ${b.objectId} kept box-only`);
        }
      }
      objects.push({
        box,
        mask,
        objectId: b.objectId,
        ...(b.confidence !== undefined ? { confidence: b.confidence } : {}),
      });
    }
    return { objects, count: objects.length, diagnostics: diagnostics.slice(0, 5) };
  } catch (err) {
    return {
      objects: [],
      count: 0,
      diagnostics: [`parse-error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}
