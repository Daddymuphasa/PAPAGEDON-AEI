'use client';

import type { EventTheme } from '@/types';

export interface FlyerControl {
  theme: EventTheme | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  onFile: (file: File) => void;
}

function energyWord(energy: number): string {
  if (energy < 0.33) return 'Low';
  if (energy < 0.66) return 'Medium';
  return 'High';
}

export default function FlyerPanel({ control }: { control: FlyerControl }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={`pg-btn justify-center ${control.busy ? 'opacity-50' : ''}`}>
        {control.busy ? 'Reading…' : 'Add your flyer'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={control.busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) control.onFile(f);
            e.target.value = '';
          }}
        />
      </label>
      {control.error && <p className="text-[11px] text-red-300">{control.error}</p>}
      {control.notice && <p className="text-[11px] text-accent-soft">{control.notice}</p>}
      {control.theme ? (
        <div className="text-[12px]">
          <div className="font-heading text-[15px]">{control.theme.eventName}</div>
          <div className="text-muted">
            {control.theme.genre} · {control.theme.mood}
          </div>
          <div className="mt-1 flex gap-1">
            {control.theme.palette.map((c) => (
              <span key={c} className="h-4 w-6 rounded-sm border border-line" style={{ background: c }} title={c} />
            ))}
          </div>
          <div className="mt-1 text-[11px] text-subtle">
            Energy: {energyWord(control.theme.energy)} · {control.theme.suggestedShaderIds.length} matching looks
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-subtle">Add a flyer and the show opens in its colours.</p>
      )}
    </div>
  );
}
