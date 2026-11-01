'use client';

// M3 control panel: palette preset or 3 custom colours, global sliders,
// plus the active visualizer's own param sliders.
import type { CSSProperties } from 'react';
import type { VisualParam } from '../../types';
import { BPM, INTENSITY, PALETTE_PRESETS, SENSITIVITY, SPEED } from '../../engine/visualParams';
import { SliderRow } from '../ui/controls';
import { font, ink, input, overlay, size, space } from '../ui/theme';

export type SliderKey = 'intensity' | 'speed' | 'sensitivity' | 'bpm';

const SLIDERS: { key: SliderKey; label: string; min: number; max: number; step: number }[] = [
  { key: 'intensity', label: 'Intensity', min: INTENSITY.min, max: INTENSITY.max, step: 0.01 },
  { key: 'speed', label: 'Speed', min: SPEED.min, max: SPEED.max, step: 0.01 },
  { key: 'sensitivity', label: 'Sensitivity', min: SENSITIVITY.min, max: SENSITIVITY.max, step: 0.01 },
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
  bare?: boolean;
  /** Control page: palette presets stay locked unless the operator opts in. */
  paletteDisabled?: boolean;
}) {
  const { preset, custom, values, visualName, visualParams, extra } = props;
  return (
    <div style={props.bare ? styles.bare : styles.panel}>
      {props.bare ? null : <h2 style={styles.head}>Controls</h2>}
      <label style={styles.row}>
        <span style={styles.label}>Palette</span>
        <select
          value={preset}
          disabled={props.paletteDisabled}
          onChange={(e) => props.onPreset(Number(e.target.value))}
          style={styles.select}
        >
          {PALETTE_PRESETS.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name}
            </option>
          ))}
          <option value={-1}>Custom</option>
        </select>
      </label>
      {preset === -1 && (
        <div style={styles.swatches}>
          {custom.map((c, i) => (
            <input
              key={i}
              type="color"
              value={c}
              disabled={props.paletteDisabled}
              title={`Custom colour ${i + 1}`}
              onChange={(e) => {
                const next = [...custom] as [string, string, string];
                next[i] = e.target.value;
                props.onCustom(next);
              }}
              style={styles.color}
            />
          ))}
        </div>
      )}
      {SLIDERS.map((s) => (
        <SliderRow
          key={s.key}
          label={s.label}
          display={s.key === 'bpm' ? String(values[s.key]) : values[s.key].toFixed(2)}
          min={s.min}
          max={s.max}
          step={s.step}
          value={values[s.key]}
          onChange={(v) => props.onSlider(s.key, v)}
        />
      ))}
      <h3 style={styles.sub}>{visualName}</h3>
      {visualParams.map((p, i) => (
        <SliderRow
          key={p.key}
          label={p.label}
          display={extra[i].toFixed(2)}
          min={p.min}
          max={p.max}
          step={0.01}
          value={extra[i]}
          onChange={(v) => props.onExtra(i, v)}
        />
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    ...overlay,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    padding: '10px 12px',
    fontFamily: font.ui,
    fontSize: size.small,
  },
  bare: { display: 'flex', flexDirection: 'column', gap: space.sm },
  head: { fontSize: size.body, fontWeight: 700, margin: 0 },
  row: { display: 'flex', alignItems: 'center', gap: space.sm },
  label: { width: 128, flexShrink: 0 },
  select: { ...input, flex: 1, minWidth: 0 },
  swatches: { display: 'flex', gap: space.sm },
  color: { ...input, padding: 2, width: 52, height: 30 },
  sub: { fontSize: size.small, fontWeight: 700, color: ink.dim, margin: 0, marginTop: space.xs },
};
