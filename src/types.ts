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
  subBass: number; // 0-1 (M4.1)
  flux: number; // spectral flux, normalized (M4.1)
  beatConfidence: number; // 0-1 (M4.1)
  energy: number; // 0-1 overall level (M3)
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

export interface VisualParam {
  key: string; // uniform suffix: key 'p1' -> uniform u_p1
  label: string;
  min: number;
  max: number;
  def: number;
}

export interface ShaderDefinition {
  id: string;
  name: string;
  fragmentGlsl: string;
  uniforms: string[];
  tags?: string[]; // e.g. ['m3-visual'] (M3)
  params?: VisualParam[]; // declared tunable ranges (M3)
}

export interface DirectorInput {
  theme: EventTheme | null;
  features: AudioFeatures;
  insight: MusicInsight | null;
  crowd: CrowdSignal | null;
}

// ---- M4 show director types (M1 ScenePlan is left untouched) ----

export type EnergyArc = 'build' | 'peak' | 'sustain' | 'breakdown' | 'release';
export type ShowTransitionType = 'crossfade' | 'cut' | 'flash-cut';
export type AudioEvent = 'build' | 'drop' | 'breakdown';

export interface ShowTransition {
  type: ShowTransitionType;
  durationMs: number;
}

export interface ShowPlan {
  visualId: string;
  params: [number, number, number];
  intensity: number; // 0-1
  speed: number; // 0-2
  paletteEmphasis: number; // palette index 0-3
  transition: ShowTransition;
  energyArc: EnergyArc;
  sectionSeconds: number;
  reason: string;
}

export interface AudioSummary {
  avgEnergy: number;
  peakEnergy: number;
  avgBass: number;
  avgMid: number;
  avgHigh: number;
  events: AudioEvent[];
  bpm: number;
  seconds: number;
}

export interface VisualizerInfo {
  id: string;
  name: string;
  tags: string[];
  params: VisualParam[];
}

// M5 track map: whole-file pre-analysis (Modal DSP, compute only). Times
// are seconds from track start; the director uses sections to anticipate.
export type SectionKind = 'intro' | 'build' | 'drop' | 'breakdown' | 'outro';

export interface TrackSection {
  start: number;
  end: number;
  kind: SectionKind;
}

export interface TrackEnergyPoint {
  t: number;
  v: number; // 0-1
}

export interface TrackMap {
  durationS: number;
  bpm: number;
  beats: number[];
  downbeats: number[];
  energy: TrackEnergyPoint[];
  sections: TrackSection[];
}

export interface UpcomingChange {
  at: number; // section boundary in track seconds
  from: SectionKind;
  to: SectionKind;
  inS: number; // seconds from now
}

// M6 listening profile: local read of the room, no model calls.
export type ListeningLabel = 'house/techno' | 'afrobeats/amapiano-ish' | 'hip-hop' | 'ambient' | 'mixed';

export interface ProfileSample {
  subBass: number;
  bass: number;
  mid: number;
  high: number;
  energy: number;
}

export interface ListeningProfile {
  bpm: number;
  bpmRange: [number, number];
  bassHeaviness: number; // 0-1, low-end share of the spectrum
  brightness: number; // 0-1, high-end share
  dynamics: number; // 0-1, energy variability over the window
  label: ListeningLabel;
  confidence: number; // 0-1
}

export interface PlannerInput {
  theme: EventTheme | null;
  summary: AudioSummary;
  upcomingSections?: UpcomingChange[];
  profile?: ListeningProfile;
  current: {
    visualId: string;
    params: [number, number, number];
    intensity: number;
    speed: number;
    paletteEmphasis: number;
  };
  lastPlans: ShowPlan[];
  visualizers: VisualizerInfo[];
}

export interface ModelUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  latencyMs: number;
  mock: boolean;
  status: string;
}
