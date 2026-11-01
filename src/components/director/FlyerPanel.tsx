'use client';

import type { EventTheme } from '@/types';

export interface FlyerControl {
  theme: EventTheme | null;
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
}

export default function FlyerPanel({ control }: { control: FlyerControl }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={`pg-btn justify-center ${control.busy ? 'opacity-50' : ''}`}>
        {control.busy ? 'Reading flyer…' : 'Upload event flyer'}
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
            energy {control.theme.energy.toFixed(2)} · {control.theme.suggestedShaderIds.length} suggested visuals
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-subtle">Drop a flyer and the director opens the show in its colours.</p>
      )}
    </div>
  );
}
