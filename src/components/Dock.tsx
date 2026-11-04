'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

// Edge dock: a side column that slides away to a slim edge tab after a
// quiet spell, leaving the stage fully visible. Any interaction inside
// re-arms the timer; the tab always reopens.
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
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`pg-tab pg-tab-${side}`}
        aria-label={`Open ${label}`}
      >
        {label}
      </button>
    );
  }
  return (
    <div
      className={`pg-dock pg-dock-${side}`}
      onPointerDownCapture={poke}
      onPointerEnter={poke}
      onFocusCapture={poke}
    >
      {children}
    </div>
  );
}
