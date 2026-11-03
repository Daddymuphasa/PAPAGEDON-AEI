'use client';

import { useState, type ReactNode } from 'react';

// Collapsible panel section: plain title, optional badge, chevron. Sections
// stay independent so any combination can be open at once.
export default function Drawer({
  title,
  badge,
  defaultOpen = true,
  panel,
  children,
}: {
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  panel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="pg-panel" data-panel={panel}>
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
