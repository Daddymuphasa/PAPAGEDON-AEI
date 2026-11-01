// Engine defs for the director: every converted pack shader as a
// DirectorVisual, with the three engine look params shared by all.
import { CATALOG } from '../../shaders/catalog';
import type { DirectorVisual } from './showDirector';
import type { VisualParam } from '../types';

// The planner's three params, mapped onto the engine renderer:
// p1 -> preset.saturationBase, p2 -> preset.saturationScale,
// p3 -> master.exposure (see engineBridge.applyLiveToEngine).
export const ENGINE_PARAMS: VisualParam[] = [
  { key: 'sat', label: 'Saturation base', min: 0, max: 0.5, def: 0.15 },
  { key: 'satScale', label: 'Saturation scale', min: 0, max: 1.5, def: 0.85 },
  { key: 'expo', label: 'Exposure', min: 0.2, max: 2, def: 1 },
];

export const ENGINE_DEFS: DirectorVisual[] = CATALOG.map((c) => ({
  id: c.id,
  name: c.name,
  tags: [...c.themeTags],
  params: ENGINE_PARAMS.map((p) => ({ ...p })),
  meta: {
    themeTags: [...c.themeTags],
    energyRange: [c.energyRange[0], c.energyRange[1]],
    moods: [...c.moods],
  },
}));

export function engineDef(id: string): DirectorVisual | undefined {
  return ENGINE_DEFS.find((d) => d.id === id);
}
