// Shared UI tokens: one broadcast-console language for every page.
// Chrome stays neutral graphite; neon lives in content (canvases,
// swatches, meters, log steps) so the show carries the color.
// Presentation only — no logic, no behavior.
import type { CSSProperties } from 'react';

export const ink = {
  bg: '#0a0a0a',
  panel: '#141414',
  raised: '#1f1f1f',
  line: '#2b2b2b',
  text: '#f2f2f2',
  dim: '#9aa0a6',
  faint: '#5f6368',
} as const;

export const signal = {
  live: '#ff2d78',
  ok: '#35d461',
  warn: '#ffd166',
  info: '#00e5ff',
  danger: '#ff2d78',
  dangerText: '#ff8095',
} as const;

export const font = {
  ui: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;

export const size = {
  display: 40,
  title: 24,
  head: 18,
  body: 16,
  small: 14,
  caption: 13,
  data: 12,
} as const;

export const radius = { card: 8, control: 6, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const panel: CSSProperties = {
  background: ink.panel,
  border: `1px solid ${ink.line}`,
  borderRadius: radius.card,
  color: ink.text,
};

export const overlay: CSSProperties = {
  background: 'rgba(10,10,10,0.78)',
  border: `1px solid ${ink.line}`,
  borderRadius: radius.card,
  color: ink.text,
};

export const btn: CSSProperties = {
  fontFamily: font.ui,
  fontSize: size.small,
  color: ink.text,
  background: ink.raised,
  border: `1px solid ${ink.line}`,
  borderRadius: radius.control,
  padding: '7px 14px',
  cursor: 'pointer',
};

export const btnActive: CSSProperties = {
  ...btn,
  background: '#262626',
  borderColor: '#555',
  fontWeight: 600,
};

export const btnDanger: CSSProperties = {
  ...btn,
  background: signal.danger,
  borderColor: signal.danger,
  color: '#fff',
  fontWeight: 600,
};

export const btnGhost: CSSProperties = {
  ...btn,
  background: 'transparent',
};

export const badge: CSSProperties = {
  fontFamily: font.ui,
  fontSize: size.small,
  fontWeight: 700,
  padding: '4px 12px',
  borderRadius: radius.pill,
  whiteSpace: 'nowrap',
};

export const input: CSSProperties = {
  fontFamily: font.ui,
  fontSize: size.small,
  color: ink.text,
  background: '#0d0d0d',
  border: `1px solid ${ink.line}`,
  borderRadius: radius.control,
  padding: '6px 8px',
};

export const tabular: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export const sectionHead: CSSProperties = {
  fontFamily: font.ui,
  fontSize: size.head,
  fontWeight: 700,
  margin: 0,
};

export const caption: CSSProperties = {
  fontFamily: font.ui,
  fontSize: size.caption,
  color: ink.dim,
};
