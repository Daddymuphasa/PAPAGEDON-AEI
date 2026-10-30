'use client';

// M2 decision log panel: newest-first trace of plan/act/observe/verify steps.
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DecisionEntry } from '../../director/decisionLog';
import { clearDecisions, getDecisions, subscribeDecisions } from '../../director/decisionLog';
import { Button } from '../ui/controls';
import { font, ink, overlay, signal, size } from '../ui/theme';

function verifyText(v: DecisionEntry['verify']): string {
  if (!v) return '—';
  return `${v.pass ? 'PASS' : 'FAIL'}: ${v.reason}`;
}

const STEP_COLORS: Record<string, string> = {
  local: '#8ab4ff',
  plan: '#c792ea',
  verify: '#ffd166',
  act: '#7bfff2',
  observe: '#9aa0a6',
  manual: '#ff9e64',
  cap: '#ff8095',
  map: '#35d461',
  listen: '#c6f24e',
};

export default function DecisionLogPanel(props: { colored?: boolean; title?: string; empty?: string } = {}) {
  const [entries, setEntries] = useState<DecisionEntry[]>(() => [...getDecisions()].reverse());

  useEffect(() => subscribeDecisions(() => setEntries([...getDecisions()].reverse())), []);

  return (
    <aside style={{ ...styles.panel, ...(props.colored ? styles.docked : null) }}>
      <div style={styles.head}>
        <h2 style={styles.title}>{props.title ?? 'Decision log'}</h2>
        <Button kind="ghost" onClick={clearDecisions} style={styles.mini}>
          Clear
        </Button>
      </div>
      {entries.length === 0 && (
        <div style={styles.empty}>{props.empty ?? 'No decisions yet — upload a flyer.'}</div>
      )}
      <ol style={styles.list}>
        {entries.map((e) => (
          <li key={e.id} style={styles.item}>
            <span style={styles.dim}>{e.time}</span>{' '}
            <span style={{ ...styles.step, ...(props.colored ? { color: STEP_COLORS[e.step] ?? '#fff' } : null) }}>
              {e.step}
            </span>{' '}
            <span style={styles.dim}>[{e.model}]</span>
            <br />
            <span>{e.input}</span> → <span>{e.result}</span>
            <br />
            <span style={e.verify?.pass === false ? styles.fail : styles.dim}>
              verify: {verifyText(e.verify)}
            </span>
            <span style={styles.dim}>
              {' '}· retries: {e.retries}
              {e.latencyMs !== null ? ` · ${e.latencyMs}ms` : ''}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    ...overlay,
    position: 'absolute',
    top: 12,
    right: 12,
    width: 360,
    maxHeight: '70vh',
    overflowY: 'auto',
    padding: '10px 12px',
    fontFamily: font.mono,
    fontSize: size.data,
    lineHeight: 1.5,
  },
  docked: { position: 'static', width: 'auto', maxHeight: 'none', background: ink.panel },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontFamily: font.ui, fontSize: size.small, fontWeight: 700, margin: 0 },
  mini: { fontSize: size.data, padding: '3px 10px' },
  empty: { color: ink.dim },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  item: { borderTop: `1px solid ${ink.line}`, paddingTop: 6 },
  dim: { color: ink.dim },
  step: { fontWeight: 700 },
  fail: { color: signal.dangerText },
};
