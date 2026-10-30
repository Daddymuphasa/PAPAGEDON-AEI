'use client';

// Tiny shared controls built on theme tokens. Presentation only.
import type { CSSProperties, ReactNode } from 'react';
import { badge, btn, btnActive, btnDanger, btnGhost, font, ink, radius, signal, size, space, tabular } from './theme';

export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  kind?: 'default' | 'active' | 'danger' | 'ghost';
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
}) {
  const base =
    props.kind === 'danger' ? btnDanger : props.kind === 'active' ? btnActive : props.kind === 'ghost' ? btnGhost : btn;
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      style={{
        ...base,
        ...(props.disabled ? { opacity: 0.45, cursor: 'default' } : null),
        ...props.style,
      }}
    >
      {props.children}
    </button>
  );
}

export function Panel(props: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: ink.panel,
        border: `1px solid ${ink.line}`,
        borderRadius: radius.card,
        color: ink.text,
        padding: '12px 14px',
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
}

export function SliderRow(props: {
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space.md,
        fontFamily: font.ui,
        fontSize: size.small,
        color: ink.text,
      }}
    >
      <span style={{ width: 128, flexShrink: 0, ...tabular }}>
        {props.label}: {props.display}
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        style={{ flex: 1, minWidth: 0 }}
      />
    </label>
  );
}

export function MeterBar(props: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
      <span style={{ width: 64, fontFamily: font.mono, fontSize: size.data, color: ink.dim }}>{props.label}</span>
      <div style={{ flex: 1, height: 12, background: '#0d0d0d', borderRadius: radius.control, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.round(Math.max(0, Math.min(1, props.value)) * 100)}%`,
            background: props.color ?? signal.info,
            borderRadius: radius.control,
          }}
        />
      </div>
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  live: signal.live,
  muted: '#333',
  ok: '#12351f',
  warn: '#3d3013',
  info: '#0d3036',
};

const TONE_FG: Record<string, string> = {
  live: '#fff',
  muted: signal.warn,
  ok: signal.ok,
  warn: signal.warn,
  info: signal.info,
};

export function Badge(props: { children: ReactNode; tone: 'live' | 'muted' | 'ok' | 'warn' | 'info' }) {
  return (
    <span style={{ ...badge, background: TONE_BG[props.tone], color: TONE_FG[props.tone] }}>{props.children}</span>
  );
}
