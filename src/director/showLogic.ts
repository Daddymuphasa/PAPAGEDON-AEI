// M4 show timing + theme mapping. Pure: Node-safe and unit-tested.
import type { EventTheme } from '../types';
import { CATALOG } from '../../shaders/catalog';

export const PLANNER_CADENCE_S = 20;
export const MIN_PLANNER_GAP_S = 8;
export const MAX_PLAN_RETRIES = 3;
export const PHRASE_BEATS = 8;
export const BREAKDOWN_PHRASE_BEATS = 16;
export const MANUAL_HOLD_S = 8;
export const MIN_SCENE_GAP_S = 8;
// A manual scene pick is the user driving: hold it well past the dwell so
// the director never cuts away from a look they just chose.
export const MANUAL_SCENE_HOLD_S = 30;
// Past this scene age anything musical may cut (an 808 slam on a stale
// scene still earns a fresh look); inside it, slams punch, not cut.
export const STALE_SCENE_S = 16;
// Pacing presets: the scene dwell each one asks the director to honour.
export const PACING_S = { calm: 12, normal: 8, wild: 5 } as const;
export type PacingName = keyof typeof PACING_S;

// Fire on cadence or on a clear energy shift, never faster than the gap.
export function shouldCallPlanner(
  now: number,
  lastCall: number | null,
  lastCadence: number | null,
  energyShifted: boolean,
): boolean {
  if (lastCall !== null && now - lastCall < MIN_PLANNER_GAP_S) return false;
  if (energyShifted) return true;
  return lastCadence === null || now - lastCadence >= PLANNER_CADENCE_S;
}

export function isPhraseBoundary(beatsSinceTransition: number, phraseLen: number): boolean {
  return beatsSinceTransition >= phraseLen;
}

// Theme -> opening scene: exact suggested id, else an energy-matched
// catalog scene. No word-matching: substring hits ("bass" -> Bass Portal)
// made every flyer open on the same scene regardless of mood.
export function mapThemeToOpening(
  theme: EventTheme | null,
  defs: { id: string; name: string }[],
): string {
  const fallback = defs[0]?.id ?? CATALOG[0]?.id ?? '';
  if (!theme) return fallback;
  for (const id of theme.suggestedShaderIds) {
    if (defs.some((d) => d.id === id)) return id;
  }
  const energy = theme.energy;
  const hit = CATALOG.find((c) => energy >= c.energyRange[0] && energy <= c.energyRange[1]) ?? CATALOG[0];
  if (!hit) return fallback;
  return defs.some((d) => d.id === hit.id) ? hit.id : fallback;
}
