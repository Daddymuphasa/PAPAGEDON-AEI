// M4 plan gate: a ShowPlan can't play without passing these plain
// checks. Pure: Node-safe and unit-tested.
import type { VisualParam } from '../types';

export const PLAN_TRANSITIONS = ['crossfade', 'cut', 'flash-cut'];
export const PLAN_ARCS = ['build', 'peak', 'sustain', 'breakdown', 'release'];
export const PLAN_INTENSITY_MIN = 0;
export const PLAN_INTENSITY_MAX = 1;
export const PLAN_SPEED_MIN = 0;
export const PLAN_SPEED_MAX = 2;
export const TRANSITION_MIN_MS = 0;
export const TRANSITION_MAX_MS = 2000;
export const SECTION_MIN_S = 10;
export const SECTION_MAX_S = 60;
export const MAX_REPEAT_VISUAL = 2;

export interface ShowVerifyResult {
  ok: boolean;
  errors: string[];
}

export function verifyShowPlan(
  plan: unknown,
  defs: { id: string; params: VisualParam[] }[],
  lastVisualIds: string[],
  knownTextureIds?: string[],
): ShowVerifyResult {
  const errors: string[] = [];
  if (typeof plan !== 'object' || plan === null) {
    return { ok: false, errors: ['plan is not an object'] };
  }
  const p = plan as Record<string, unknown>;
  const def = defs.find((d) => d.id === p.visualId);
  if (typeof p.visualId !== 'string' || !def) {
    errors.push(`unknown visualId: ${String(p.visualId)}`);
  } else {
    if (!Array.isArray(p.params) || p.params.length !== 3) {
      errors.push('params must be an array of 3 numbers');
    } else {
      p.params.forEach((v: unknown, i: number) => {
        const range = def.params[i];
        if (typeof v !== 'number' || !range || v < range.min || v > range.max) {
          errors.push(`param ${i} out of range ${range ? `${range.min}-${range.max}` : '(no range)'}`);
        }
      });
    }
  }
  if (typeof p.intensity !== 'number' || p.intensity < PLAN_INTENSITY_MIN || p.intensity > PLAN_INTENSITY_MAX) {
    errors.push(`intensity must be ${PLAN_INTENSITY_MIN}-${PLAN_INTENSITY_MAX}`);
  }
  if (typeof p.speed !== 'number' || p.speed < PLAN_SPEED_MIN || p.speed > PLAN_SPEED_MAX) {
    errors.push(`speed must be ${PLAN_SPEED_MIN}-${PLAN_SPEED_MAX}`);
  }
  if (typeof p.paletteEmphasis !== 'number' || !Number.isInteger(p.paletteEmphasis) || p.paletteEmphasis < 0 || p.paletteEmphasis > 3) {
    errors.push('paletteEmphasis must be an integer 0-3');
  }
  const tr = p.transition as Record<string, unknown> | null;
  if (typeof tr !== 'object' || tr === null || !PLAN_TRANSITIONS.includes(tr.type as string)) {
    errors.push(`transition.type must be one of ${PLAN_TRANSITIONS.join(', ')}`);
  }
  if (typeof tr?.durationMs !== 'number' || tr.durationMs < TRANSITION_MIN_MS || tr.durationMs > TRANSITION_MAX_MS) {
    errors.push(`transition.durationMs must be ${TRANSITION_MIN_MS}-${TRANSITION_MAX_MS}`);
  }
  if (typeof p.energyArc !== 'string' || !PLAN_ARCS.includes(p.energyArc)) {
    errors.push(`energyArc must be one of ${PLAN_ARCS.join(', ')}`);
  }
  if (typeof p.sectionSeconds !== 'number' || p.sectionSeconds < SECTION_MIN_S || p.sectionSeconds > SECTION_MAX_S) {
    errors.push(`sectionSeconds must be ${SECTION_MIN_S}-${SECTION_MAX_S}`);
  }
  if (typeof p.reason !== 'string' || !p.reason.trim()) errors.push('missing or empty: reason');
  // M7: texture fields are optional — absent/null falls back to the
  // energy-tag match. When present, both must validate.
  if (p.texture !== undefined && p.texture !== null) {
    if (typeof p.texture !== 'string' || p.texture === '') {
      errors.push('texture must be an event image id or null');
    } else if (knownTextureIds !== undefined && !knownTextureIds.includes(p.texture)) {
      errors.push(`unknown texture: ${p.texture}`);
    }
  }
  if (p.texMix !== undefined && p.texMix !== null) {
    if (typeof p.texMix !== 'number' || !Number.isFinite(p.texMix) || p.texMix < 0 || p.texMix > 1) {
      errors.push('texMix must be 0-1');
    }
  }
  const tail = lastVisualIds.slice(-MAX_REPEAT_VISUAL);
  if (tail.length === MAX_REPEAT_VISUAL && tail.every((id) => id === p.visualId)) {
    errors.push(`visual ${String(p.visualId)} would repeat more than twice in a row`);
  }
  return { ok: errors.length === 0, errors };
}
