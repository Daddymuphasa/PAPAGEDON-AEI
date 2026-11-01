// Plain-code theme checks (M2). Pure: client-, server- and test-safe.
// The model must return a well-formed theme; these checks prove it.
import { CATALOG_IDS } from '../../../shaders/catalog';

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
export const PALETTE_MIN_COLORS = 3;
export const PALETTE_MAX_COLORS = 6;
export const TEMPO_MIN_BPM = 60;
export const TEMPO_MAX_BPM = 180;
export const SCENE_SWITCH_MIN_S = 2;
export const SCENE_SWITCH_MAX_S = 30;
export const ENERGY_MIN = 0;
export const ENERGY_MAX = 1;
export const MOTIF_MAX_COUNT = 8;
export const MIN_SUGGESTED_SHADERS = 1;
export const MAX_RETRIES = 3;

export interface VerifyResult {
  ok: boolean;
  errors: string[];
}

function checkRange(
  value: unknown,
  name: string,
  lo: number,
  hi: number,
  errors: string[],
): void {
  const v = value as { min?: unknown; max?: unknown } | null;
  if (typeof v !== 'object' || v === null || typeof v.min !== 'number' || typeof v.max !== 'number') {
    errors.push(`${name} must be {min,max} numbers`);
    return;
  }
  if (v.min > v.max) errors.push(`${name}.min must not exceed ${name}.max`);
  if (v.min < lo || v.max > hi) errors.push(`${name} must stay within ${lo}-${hi}`);
}

export function verifyThemePlain(theme: unknown, availableIds?: string[]): VerifyResult {
  const ids = availableIds && availableIds.length > 0 ? availableIds : CATALOG_IDS;
  const errors: string[] = [];
  if (typeof theme !== 'object' || theme === null) {
    return { ok: false, errors: ['theme is not an object'] };
  }
  const t = theme as Record<string, unknown>;

  for (const k of ['eventName', 'genre', 'mood', 'typographyFeel']) {
    if (typeof t[k] !== 'string' || !(t[k] as string).trim()) errors.push(`missing or empty: ${k}`);
  }
  if (typeof t.energy !== 'number' || t.energy < ENERGY_MIN || t.energy > ENERGY_MAX) {
    errors.push(`energy must be a number ${ENERGY_MIN}-${ENERGY_MAX}`);
  }

  if (
    !Array.isArray(t.palette) ||
    t.palette.length < PALETTE_MIN_COLORS ||
    t.palette.length > PALETTE_MAX_COLORS
  ) {
    errors.push(`palette must hold ${PALETTE_MIN_COLORS}-${PALETTE_MAX_COLORS} colours`);
  } else {
    for (const c of t.palette) {
      if (typeof c !== 'string' || !HEX_COLOR.test(c)) errors.push(`invalid hex colour: ${String(c)}`);
    }
  }

  if (!Array.isArray(t.motifs) || t.motifs.length > MOTIF_MAX_COUNT || !t.motifs.every((m) => typeof m === 'string')) {
    errors.push(`motifs must be a string array of at most ${MOTIF_MAX_COUNT}`);
  }

  checkRange(t.tempoBpm, 'tempoBpm', TEMPO_MIN_BPM, TEMPO_MAX_BPM, errors);
  checkRange(t.sceneSwitchSeconds, 'sceneSwitchSeconds', SCENE_SWITCH_MIN_S, SCENE_SWITCH_MAX_S, errors);

  if (!Array.isArray(t.suggestedShaderIds) || t.suggestedShaderIds.length < MIN_SUGGESTED_SHADERS) {
    errors.push(`suggestedShaderIds must list at least ${MIN_SUGGESTED_SHADERS} shader`);
  } else {
    for (const id of t.suggestedShaderIds) {
      if (typeof id !== 'string' || !ids.includes(id)) {
        errors.push(`unknown shader id: ${String(id)}`);
      }
    }
  }

  // Roles are optional (old cached themes lack them) but must be valid hex.
  if (t.roles !== undefined) {
    if (typeof t.roles !== 'object' || t.roles === null) {
      errors.push('roles must be an object when present');
    } else {
      const r = t.roles as Record<string, unknown>;
      for (const k of ['background', 'primary', 'secondary', 'accent', 'highlight']) {
        if (typeof r[k] !== 'string' || !HEX_COLOR.test(r[k] as string)) {
          errors.push(`invalid hex colour in roles.${k}: ${String(r[k])}`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
