'use client';

// PAPAGEDON AEI launcher: the old M2 flyer flow retired here in Phase 1.
// The show runs from Show control; this page just points the way.
import type { CSSProperties } from 'react';
import { withBasePath } from '../basePath';
import { font, ink, radius, signal, size, space } from './ui/theme';

const LINKS = [
  {
    href: '/show/control',
    title: 'Show control',
    body: 'Run the live show: flyer in, director decisions, preview, output window.',
  },
  {
    href: '/show/output',
    title: 'Output window',
    body: 'Fullscreen projector wall. Open on the second display, then press play in control.',
  },
  {
    href: '/gallery',
    title: 'Gallery',
    body: 'Browse every visual with live audio-reactive thumbnails.',
  },
];

export default function Home() {
  return (
    <main style={styles.page}>
      <p style={styles.kicker}>PAPAGEDON</p>
      <h1 style={styles.title}>Autonomous Event Intelligence</h1>
      <p style={styles.sub}>Drop a flyer, press play — the director runs the wall.</p>
      <div style={styles.grid}>
        {LINKS.map((l) => (
          <a key={l.href} href={withBasePath(l.href)} style={styles.card}>
            <span style={styles.cardTitle}>{l.title}</span>
            <span style={styles.cardBody}>{l.body}</span>
          </a>
        ))}
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: ink.bg,
    color: ink.text,
    fontFamily: font.ui,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.xl,
    textAlign: 'center',
  },
  kicker: {
    margin: 0,
    fontSize: size.small,
    fontWeight: 700,
    letterSpacing: 6,
    color: signal.live,
  },
  title: { margin: 0, fontSize: size.display, fontWeight: 800 },
  sub: { margin: 0, fontSize: size.body, color: ink.dim },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: space.md,
    width: 'min(860px, 100%)',
    marginTop: space.lg,
    textAlign: 'left',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    background: ink.panel,
    border: `1px solid ${ink.line}`,
    borderRadius: radius.card,
    padding: '16px 18px',
    color: ink.text,
    textDecoration: 'none',
  },
  cardTitle: { fontSize: size.head, fontWeight: 700 },
  cardBody: { fontSize: size.small, color: ink.dim },
};
