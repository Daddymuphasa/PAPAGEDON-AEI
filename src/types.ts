// PAPAGEDON AEI shared types (M1).
export interface EventTheme {
  eventName: string;
  genre: string;
  mood: string;
  palette: string[]; // hex, e.g. ["#ff2d78", ...]
  energy: number; // 0-1
  motifs: string[];
  typographyFeel: string;
  tempoBpm: { min: number; max: number }; // suggested BPM range (M2)
  sceneSwitchSeconds: { min: number; max: number }; // suggested visual cut interval (M2)
  suggestedShaderIds: string[]; // ids from the shader registry (M2)
}

export interface ThemeVerdict {
  pass: boolean;
  reason: string;
}

export interface AudioFeatures {
  bpm: number;
  beat: boolean;
  onset: boolean;
  bass: number; // 0-1
  mid: number;
  high: number;
  buildUp: boolean;
  drop: boolean;
  timestamp: number;
}

export type MusicSection = 'intro' | 'build' | 'drop' | 'breakdown' | 'unknown';

export interface MusicInsight {
  genre: string;
  section: MusicSection;
  mood: string;
  lyrics: string;
  keywords: string[];
  timestamp: number;
}

export interface CrowdSignal {
  density: number; // 0-1
  movement: number; // 0-1
  timestamp: number;
}

export interface ScenePlan {
  shaderId: string;
  palette: string[];
  intensity: number; // 0-1
  textureUrl: string | null;
  transition: { type: 'cut' | 'fade' | 'wipe'; durationMs: number };
  lyricWords: string[];
}

export interface ShaderDefinition {
  id: string;
  name: string;
  fragmentGlsl: string;
  uniforms: string[];
}

export interface DirectorInput {
  theme: EventTheme | null;
  features: AudioFeatures;
  insight: MusicInsight | null;
  crowd: CrowdSignal | null;
}
