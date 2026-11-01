// M4 show timing + theme mapping. Pure: Node-safe and unit-tested.
import type { EventTheme } from '../types';
import { CATALOG } from '../../shaders/catalog';

export const PLANNER_CADENCE_S = 20;
export const MIN_PLANNER_GAP_S = 8;
export const MAX_PLAN_RETRIES = 3;
export const PHRASE_BEATS = 8;
export const BREAKDOWN_PHRASE_BEATS = 16;
export const MANUAL_HOLD_S = 8;

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
