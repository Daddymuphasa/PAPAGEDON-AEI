// M7 event-visual prompts. Pure: shared by the server-side Muse Image
// caller and the mock path. Written fresh for this repo.
import type { EnergyTag, EventTheme } from '../types';

export const ENERGY_TAGS: EnergyTag[] = ['calm', 'build', 'peak', 'drop'];
export const DEFAULT_IMAGE_COUNT = 4;

const TAG_DIRECTION: Record<EnergyTag, string> = {
  calm: 'slow drifting haze, soft wide gradients, sparse gentle glow, meditative and dark',
  build: 'rising diagonal energy, tightening ribbons of light, growing tension, anticipation',
  peak: 'maximum intensity, dense radiant filaments, saturated bloom, ecstatic and electric',
  drop: 'explosive impact frozen mid-burst, shockwave rings radiating outward, heavy contrast',
};

// Short stable hash of the theme parts the artwork depends on, so one
// theme maps to one cached image set. Base-36, no separators.
export function themeHash(theme: EventTheme): string {
  const input = [
    theme.eventName,
    theme.genre,
    theme.mood,
    theme.palette.join(','),
    theme.motifs.join(','),
  ].join('|');
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function eventImageId(theme: EventTheme, tag: EnergyTag): string {
  return `evt-${tag}-${themeHash(theme)}`;
}

// One projector-friendly texture prompt per energy level. Abstract and
// loopable: nothing readable, nothing that fights the shaders.
export function buildImagePrompt(theme: EventTheme, tag: EnergyTag): string {
  const palette = theme.palette.slice(0, 4).join(', ');
  const motifs = theme.motifs.slice(0, 4).join(', ');
  return (
    `Abstract loopable stage-visual texture for "${theme.eventName}", a ${theme.mood} ` +
    `${theme.genre} night. Energy level: ${tag} — ${TAG_DIRECTION[tag]}. ` +
    `Dominant colours ${palette}. ` +
    (motifs ? `Echo these motifs abstractly: ${motifs}. ` : '') +
    'Seamless all-over pattern, dark projector-friendly background, no text, no logos, ' +
    'no faces, no people, no readable symbols.'
  );
}

// Tags for a generation run: one per energy level by default, cycling
// when a custom count is requested.
export function tagsForCount(count: number): EnergyTag[] {
  const n = Math.max(1, Math.min(8, Math.floor(count)));
  return Array.from({ length: n }, (_, i) => ENERGY_TAGS[i % ENERGY_TAGS.length]);
}
