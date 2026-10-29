'use client';

// M3 control panel: palette preset or 3 custom colours, global sliders,
// plus the active visualizer's own param sliders.
import type { CSSProperties } from 'react';
import type { VisualParam } from '../../../types';
import { BPM, INTENSITY, PALETTE_PRESETS, SENSITIVITY, SPEED } from '../../../engine/visualParams';

export type SliderKey = 'intensity' | 'speed' | 'sensitivity' | 'bpm';

const SLIDERS: { key: SliderKey; label: string; min: number; max: number; step: number }[] = [
  { key: 'intensity', label: 'Intensity', min: INTENSITY.min, max: INTENSITY.max, step: 0.01 },
  { key: 'speed', label: 'Speed', min: SPEED.min, max: SPEED.max, step: 0.01 },
  { key: 'sensitivity', label: 'Audio sensitivity', min: SENSITIVITY.min, max: SENSITIVITY.max, step: 0.01 },
  { key: 'bpm', label: 'Mock BPM', min: BPM.min, max: BPM.max, step: 1 },
];

export default function ControlPanel(props: {
  preset: number;
  custom: [string, string, string];
  values: Record<SliderKey, number>;
  visualName: string;
  visualParams: VisualParam[];
  extra: [number, number, number];
  onPreset(i: number): void;
  onCustom(c: [string, string, string]): void;
  onSlider(key: SliderKey, v: number): void;
  onExtra(i: number, v: number): void;
}) {
  const { preset, custom, values, visualName, visualParams, extra } = props;
  return (
    <div style={styles.panel}>
      <strong>Controls</strong>
      <label style={styles.row}>
        Palette:{' '}
        <select value={preset} onChange={(e) => props.onPreset(Number(e.target.value))}>
          {PALETTE_PRESETS.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name}
            </option>
          ))}
          <option value={-1}>Custom</option>
        </select>
      </label>
      {preset === -1 && (
        <div style={styles.row}>
          {custom.map((c, i) => (
            <input
              key={i}
              type="color"
              value={c}
              onChange={(e) => {
                const next = [...custom] as [string, string, string];
                next[i] = e.target.value;
                props.onCustom(next);
              }}
            />
          ))}
        </div>
      )}
      {SLIDERS.map((s) => (
        <label key={s.key} style={styles.row}>
          {s.label}: {values[s.key]}
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={values[s.key]}
            onChange={(e) => props.onSlider(s.key, Number(e.target.value))}
            style={styles.slider}
          />
        </label>
      ))}
      <strong style={styles.sub}>{visualName}</strong>
      {visualParams.map((p, i) => (
        <label key={p.key} style={styles.row}>
          {p.label}: {extra[i].toFixed(2)}
          <input
            type="range"
            min={p.min}
            max={p.max}
            step={0.01}
            value={extra[i]}
            onChange={(e) => props.onExtra(i, Number(e.target.value))}
            style={styles.slider}
          />
        </label>
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: 'rgba(0,0,0,0.72)',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '10px 12px',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
  },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  slider: { flex: 1 },
  sub: { marginTop: 4 },
};
