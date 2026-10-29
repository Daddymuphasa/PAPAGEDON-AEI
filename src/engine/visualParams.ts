// M3 shared gallery params. One VisualParams object flows into every
// visualizer. Palettes are built-in hex presets or 3 custom colours.
export interface VisualParams {
  palette: string[]; // resolved to 4 hex colours
  intensity: number; // 0-1
  speed: number; // 0-2
  sensitivity: number; // 0-2, multiplies audio bands CPU-side
  bpm: number; // mock-signal tempo
}

export interface PalettePreset {
  name: string;
  colors: [string, string, string, string];
}

export const PALETTE_PRESETS: PalettePreset[] = [
  { name: 'Neon Nights', colors: ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'] },
  { name: 'Acid Garden', colors: ['#39ff14', '#00e5ff', '#faff00', '#ff6b00'] },
  { name: 'Ultraviolet', colors: ['#b537f2', '#6a00f4', '#00e5ff', '#ff2d78'] },
  { name: 'Magma', colors: ['#ff3d00', '#ff9100', '#ffd166', '#7b2dff'] },
  { name: 'Ice Signal', colors: ['#00e5ff', '#7bfff2', '#e8feff', '#7b2dff'] },
];

export const INTENSITY = { min: 0, max: 1, def: 0.7 };
export const SPEED = { min: 0, max: 2, def: 1 };
export const SENSITIVITY = { min: 0, max: 2, def: 1 };
export const BPM = { min: 60, max: 180, def: 126 };

export const DEFAULT_VISUAL_PARAMS: VisualParams = {
  palette: [...PALETTE_PRESETS[0].colors],
  intensity: INTENSITY.def,
  speed: SPEED.def,
  sensitivity: SENSITIVITY.def,
  bpm: BPM.def,
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// The panel takes 3 custom colours; the 4th slot is their average.
export function customPalette(colors: [string, string, string]): [string, string, string, string] {
  const [r, g, b] = colors.map(hexToRgb).reduce(
    (acc, c) => [acc[0] + c[0] / 3, acc[1] + c[1] / 3, acc[2] + c[2] / 3],
    [0, 0, 0],
  );
  return [colors[0], colors[1], colors[2], rgbToHex(r, g, b)];
}
