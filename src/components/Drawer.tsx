'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

// Collapsible panel section: plain title, optional badge, chevron. Sections
// stay independent so any combination can be open at once. Panels
// auto-collapse after a quiet spell so the stage stays visible; any
// interaction inside re-arms the timer, and the header always reopens.
export const DRAWER_IDLE_MS = 12000;

export default function Drawer({
  title,
  badge,
  defaultOpen = true,
  panel,
  autoCollapseMs = DRAWER_IDLE_MS,
  children,
}: {
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  panel?: string;
  autoCollapseMs?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const timer = useRef<number | null>(null);
  const arm = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), autoCollapseMs);
  }, [autoCollapseMs]);
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
    <section
      className="pg-panel"
      data-panel={panel}
      onPointerDownCapture={poke}
      onPointerEnter={poke}
      onFocusCapture={poke}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="pg-label">{title}</span>
        <span className="flex items-center gap-2">
          {badge}
          <span className="text-muted" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
        </span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </section>
  );
}
