// M4 show bus: control -> output sync over BroadcastChannel (same machine).
// Only scene/param/palette/blackout changes cross the channel — never
// per-frame audio. Node-safe (channel opens on open(), not import).
import type { EnergyTag, ShowTransition } from '../types';

// M7: one event visual crossing to the projector (data URL included).
export interface VisualPayload {
  id: string;
  energyTag: EnergyTag;
  dataUrl: string;
}

// M8: one segmentation read crossing to the projector (b64 grids +
// smoothed signals). No camera pixels — masks only.
export interface SegPayload {
  w: number;
  h: number;
  perf: string;
  crowd: string;
  box: [number, number, number, number] | null; // xywh, normalized
  present: boolean;
  coverage: number;
  motion: number;
  strength: number; // manual mask strength 0-1
  at: number; // control clock ms, for the stale fade
}

export type ShowSource = 'mic' | 'file' | 'mock';

export interface ShowSnapshot {
  visualId: string;
  extra: [number, number, number];
  intensity: number;
  speed: number;
  palette: string[];
  paletteEmphasis: number;
  sensitivity: number;
  blackout: boolean;
  source: ShowSource;
  bpm: number;
  t0: number; // shared audio-clock origin (performance.now ms)
  fileName: string | null;
}

export interface FeatFields {
  seq: number;
  ts: number;
  bass: number;
  subBass: number;
  mid: number;
  high: number;
  energy: number;
  flux: number;
  beat: boolean;
  beatConfidence: number;
  bpm: number;
  buildUp: boolean;
  drop: boolean;
}

export type FeatPacket = { t: 'feat' } & FeatFields;

export type BusMessage =
  | { t: 'ready' }
  | { t: 'state'; state: ShowSnapshot }
  | {
      t: 'scene';
      visualId: string;
      extra: [number, number, number];
      intensity: number;
      speed: number;
      palette: string[];
      paletteEmphasis: number;
      transition: ShowTransition;
    }
  | { t: 'tweak'; intensity: number; speed: number; extra: [number, number, number]; paletteEmphasis: number; sensitivity: number }
  | { t: 'hit'; flash: number; boost: number }
  | { t: 'blackout'; on: boolean }
  | { t: 'audio'; source: ShowSource; bpm: number; t0: number }
  | { t: 'visuals'; images: VisualPayload[] }
  | { t: 'texture'; id: string | null; texMix: number }
  | { t: 'seg'; seg: SegPayload }
  | { t: 'alive'; now: number }
  | FeatPacket
  | { t: 'outStats'; fps: number; msSincePacket: number };

export const SHOW_CHANNEL = 'aei-show';
export const FILE_MAX_BYTES = 50 * 1024 * 1024;
export const HEARTBEAT_MS = 1000;
export const HEARTBEAT_TIMEOUT_MS = 3000;
export const START_DELAY_MS = 300; // control file-start lead time

export class ShowBus {
  private ch: BroadcastChannel | null = null;
  onMessage: ((m: BusMessage) => void) | null = null;

  open(): void {
    this.close();
    this.ch = new BroadcastChannel(SHOW_CHANNEL);
    this.ch.onmessage = (e: MessageEvent) => {
      const m = e.data as BusMessage;
      if (m && typeof m.t === 'string') this.onMessage?.(m);
    };
  }

  post(m: BusMessage): void {
    this.ch?.postMessage(m);
  }

  close(): void {
    this.ch?.close();
    this.ch = null;
  }
}
