'use client';

// M2 decision log panel: newest-first trace of plan/act/observe/verify steps.
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DecisionEntry } from '../../director/decisionLog';
import { clearDecisions, getDecisions, subscribeDecisions } from '../../director/decisionLog';

function verifyText(v: DecisionEntry['verify']): string {
  if (!v) return '—';
  return `${v.pass ? 'PASS' : 'FAIL'}: ${v.reason}`;
}

export default function DecisionLogPanel() {
  const [entries, setEntries] = useState<DecisionEntry[]>(() => [...getDecisions()].reverse());

  useEffect(() => subscribeDecisions(() => setEntries([...getDecisions()].reverse())), []);

  return (
    <aside style={styles.panel}>
      <div style={styles.head}>
        <strong>Decision log</strong>
        <button style={styles.mini} onClick={clearDecisions}>
          Clear
        </button>
      </div>
      {entries.length === 0 && <div style={styles.empty}>No decisions yet — upload a flyer.</div>}
      <ol style={styles.list}>
        {entries.map((e) => (
          <li key={e.id} style={styles.item}>
            <span style={styles.dim}>{e.time}</span> <span style={styles.step}>{e.step}</span>{' '}
            <span style={styles.dim}>[{e.model}]</span>
            <br />
            <span>{e.input}</span> → <span>{e.result}</span>
            <br />
            <span style={styles.dim}>
              verify: {verifyText(e.verify)} · retries: {e.retries}
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
    position: 'absolute',
    top: 12,
    right: 12,
    width: 340,
    maxHeight: '70vh',
    overflowY: 'auto',
    background: 'rgba(0,0,0,0.72)',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '8px 10px',
    fontFamily: 'ui-monospace, monospace',
    fontSize: 11,
    lineHeight: 1.5,
  },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mini: { fontSize: 11, cursor: 'pointer' },
  empty: { opacity: 0.6 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  item: { borderTop: '1px solid #222', paddingTop: 6 },
  dim: { opacity: 0.6 },
  step: { fontWeight: 'bold' },
};
