'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

// Edge dock: a side column that glides away to a slim edge tab after a
// quiet spell, leaving the stage fully visible. Resting the mouse near
// either screen edge (or tapping the tab) glides it back out; any
// interaction inside re-arms the timer.
export const DOCK_IDLE_MS = 3000;

export default function Dock({
  side,
  label,
  children,
}: {
  side: 'left' | 'right';
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const timer = useRef<number | null>(null);
  const arm = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), DOCK_IDLE_MS);
  }, []);
  useEffect(() => {
    if (open) arm();
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [open, arm]);
  const poke = useCallback(() => {
    if (open) arm();
  }, [open, arm]);
  return (
    <>
      <div
        className={`pg-edge pg-edge-${side}`}
        aria-hidden="true"
        onPointerEnter={() => setOpen(true)}
      />
      <div
        className={`pg-dock pg-dock-${side}${open ? '' : ' is-closed'}`}
        onPointerDownCapture={poke}
        onPointerEnter={poke}
        onFocusCapture={poke}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`pg-tab pg-tab-${side}${open ? ' is-hidden' : ''}`}
        aria-label={`Open ${label}`}
        tabIndex={open ? -1 : 0}
      >
        {label}
      </button>
    </>
  );
}
