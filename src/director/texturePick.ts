// M7 texture picking (pure): which event image fits the current section.
// Muse Spark may name a texture id + mix in its plan; anything invalid
// falls back to the energy-tag match. Node-safe and unit-tested.
import type { EnergyArc, EnergyTag, TextureMeta } from '../types';

export const DEFAULT_TEX_MIX = 0.4;
export const TEX_BEAT_PUSH = 0.25;

export const ARC_TEXTURE: Record<EnergyArc, EnergyTag> = {
  build: 'build',
  peak: 'peak',
  sustain: 'build',
  breakdown: 'calm',
  release: 'calm',
};

export interface TexturePick {
  id: string | null;
  texMix: number;
}

function live(images: TextureMeta[]): TextureMeta[] {
  return images.filter((i) => i.enabled);
}

// First enabled image with the tag, else the first enabled image, else null.
export function pickTextureForTag(tag: EnergyTag, images: TextureMeta[]): string | null {
  const on = live(images);
  return on.find((i) => i.energyTag === tag)?.id ?? on[0]?.id ?? null;
}

function validMix(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : null;
}

// Plan choice wins when it names an enabled image; otherwise the arc's
// energy tag decides. Same rule for the mix: valid plan value or default.
export function pickTextureForPlan(
  planTexture: unknown,
  planTexMix: unknown,
  images: TextureMeta[],
  arc: EnergyArc,
): TexturePick {
  const on = live(images);
  const named =
    typeof planTexture === 'string' && planTexture !== '' ? on.find((i) => i.id === planTexture) : undefined;
  const id = named?.id ?? pickTextureForTag(ARC_TEXTURE[arc], images);
  return { id, texMix: validMix(planTexMix) ?? DEFAULT_TEX_MIX };
}
