// Shared mock payloads (MOCK mode). Client-safe: no keys, no fetches.
import type { CrowdSignal, DirectorInput, EventTheme, MusicInsight, ScenePlan } from '../types';

export const mockTheme: EventTheme = {
  eventName: 'Lagos Neon Nights',
  genre: 'Afrobeats',
  mood: 'electric',
  palette: ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'],
  energy: 0.85,
  motifs: ['neon', 'waves', 'silhouettes'],
  typographyFeel: 'bold condensed glow',
  tempoBpm: { min: 95, max: 125 },
  sceneSwitchSeconds: { min: 4, max: 12 },
  suggestedShaderIds: ['example-bass-pulse'],
};

export const mockInsight: MusicInsight = {
  genre: 'Afrobeats',
  section: 'build',
  mood: 'electric',
  lyrics: '',
  keywords: ['lagos', 'tonight', 'dance'],
  timestamp: Date.now(),
};

export const mockCrowdSignal: CrowdSignal = { density: 0.6, movement: 0.5, timestamp: Date.now() };

export function mockPlan(input?: Partial<DirectorInput>): ScenePlan {
  return {
    shaderId: 'example-bass-pulse',
    palette: input?.theme?.palette ?? mockTheme.palette,
    intensity: 0.7,
    textureUrl: null,
    transition: { type: 'fade', durationMs: 600 },
    lyricWords: [],
  };
}
