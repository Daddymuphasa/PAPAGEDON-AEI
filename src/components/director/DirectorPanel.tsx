'use client';

import { useEffect, useState } from 'react';
import {
  getCredits,
  resetCredits,
  setCallCap,
  subscribeCredits,
  totalTokens,
  type CreditState,
} from '@/director/credit';
import { getDecisions, subscribeDecisions, type DecisionEntry } from '@/director/decisionLog';
import type { DirectorView } from '@/director/showDirector';
import type { EnergyTag } from '@/types';
import { CATALOG } from '../../../shaders/catalog';
import { ORIGINALS } from '@/vision3d/originals';
import Drawer from '../Drawer';

export interface PanelImage {
  id: string;
  energyTag: EnergyTag;
  enabled: boolean;
  dataUrl: string;
}

export interface DirectorControl {
  auto: boolean;
  setAuto: (v: boolean) => void;
  view: DirectorView | null;
  mode: { live: boolean; model: string } | null;
  samStatus: string;
  diag: { running: boolean; checked: number; total: number; failures: string[] } | null;
  onCompileAll: () => void;
  diag3d: { running: boolean; checked: number; total: number; failures: string[] } | null;
  onCheck3D: () => void;
  shaderBusy: boolean;
  shaderStatus: string | null;
  generatedCount: number;
  onGenerateShader: () => void;
  visualsBusy: boolean;
  visualsStatus: string | null;
  images: PanelImage[];
  onGenerateVisuals: () => void;
  onToggleImage: (id: string, enabled: boolean) => void;
  texMix: number;
  onTexMix: (v: number) => void;
  canGenerate: boolean;
}

function modelBadge(model: string): string {
  if (model.includes('spark')) return 'SPARK';
  if (model.includes('image')) return 'IMAGE';
  if (model.includes('sam')) return 'SAM';
  if (model === 'mock') return 'MOCK';
  return 'LOCAL';
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[52px_1fr] items-center gap-2">
      <span className="pg-label !tracking-[0.12em]">{label}</span>
      <div className="pg-meter">
        <span style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
      </div>
    </div>
  );
}

export default function DirectorPanel({ control }: { control: DirectorControl }) {
  const [decisions, setDecisions] = useState<DecisionEntry[]>(() => getDecisions());
  const [credits, setCredits] = useState<CreditState>(() => getCredits());
  useEffect(() => {
    const offDecisions = subscribeDecisions(() => setDecisions([...getDecisions()]));
    const offCredits = subscribeCredits(() => setCredits({ ...getCredits() }));
    return () => {
      offDecisions();
      offCredits();
    };
  }, []);
  const v = control.view;
  const log = decisions.slice(-12).reverse();
  return (
    <div className="flex max-h-full flex-col gap-3 overflow-y-auto">
      <Drawer
        title="Auto show"
        badge={
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {control.mode === null ? '…' : control.mode.live ? `live · ${control.mode.model}` : 'mock'}
          </span>
        }
      >
        <button
          className={`pg-btn w-full justify-center ${control.auto ? 'pg-btn-on' : ''}`}
          onClick={() => control.setAuto(!control.auto)}
        >
          {control.auto ? 'Automatic · on' : 'Automatic · off'}
        </button>
        {v && (
          <div className="mt-2 text-[12px]">
            <div className="font-heading text-[15px]">{v.sceneName}</div>
            <div className="text-muted">{v.reason}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-subtle">
              next change {v.countdownS}s{v.plannerBusy ? ' · thinking' : ''}
            </div>
            <div className="mt-1 grid gap-1.5">
              <Meter label="Intensity" value={v.live.intensity} />
            </div>
            <div className="mt-1 text-[11px] text-subtle">
              {v.events.length > 0 ? `Events: ${v.events.join(', ')}` : 'Listening for drops…'}
            </div>
            {v.profile && (
              <div className="text-[11px] text-subtle">
                room: {v.profile.label} · {v.profile.bpm} bpm
              </div>
            )}
            <div className="text-[11px] text-subtle">{control.samStatus}</div>
          </div>
        )}
      </Drawer>

      <Drawer
        title="What happened"
        badge={<span className="font-mono text-[10px] text-subtle">{decisions.length}</span>}
        defaultOpen={false}
      >
        {log.length === 0 && <p className="text-[11px] text-subtle">Nothing yet — the log fills as the show runs.</p>}
        <ol className="grid gap-1.5">
          {log.map((e) => (
            <li key={e.id} className="text-[11px] leading-snug" title={`${e.input} → ${e.result}`}>
              <span className="font-mono text-subtle">{e.time}</span>{' '}
              <span className="font-mono text-accent">[{modelBadge(e.model)}]</span>{' '}
              <span>{e.result}</span>
              {e.verify && !e.verify.pass && <span className="text-red-300"> ✗ {e.verify.reason}</span>}
            </li>
          ))}
        </ol>
      </Drawer>

      <Drawer title="Meta usage" defaultOpen={false}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px]">
            {credits.calls}/{credits.callCap} calls · {totalTokens(credits)} tokens
            {credits.capped && <span className="text-red-300"> · limit reached, running locally</span>}
          </span>
          <button className="pg-btn !px-2 !py-1" onClick={() => resetCredits()}>
            Reset
          </button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-[11px] text-subtle">
          Call limit
          <input
            type="number"
            min={1}
            max={10000}
            defaultValue={credits.callCap}
            key={credits.callCap}
            className="pg-select !w-24"
            onChange={(e) => setCallCap(Number(e.target.value) || 1)}
          />
        </label>
      </Drawer>

      <Drawer title="Event artwork">
        <button
          className="pg-btn w-full justify-center"
          disabled={control.visualsBusy || !control.canGenerate}
          onClick={control.onGenerateVisuals}
        >
          {control.visualsBusy ? 'Making…' : 'Make event artwork'}
        </button>
        {control.visualsStatus && <p className="mt-1 text-[11px] text-subtle">{control.visualsStatus}</p>}
        {control.images.length > 0 && (
          <>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {control.images.map((img) => (
                <label key={img.id} className="grid gap-1 text-[10px] text-subtle" title={`${img.id} (${img.energyTag})`}>
                  <img
                    src={img.dataUrl}
                    alt=""
                    className="aspect-video w-full rounded border border-line object-cover"
                    style={{ opacity: img.enabled ? 1 : 0.3 }}
                  />
                  <span className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={img.enabled}
                      onChange={(e) => control.onToggleImage(img.id, e.target.checked)}
                    />
                    {img.energyTag}
                  </span>
                </label>
              ))}
            </div>
            <label className="mt-2 grid gap-1 text-[11px] text-subtle">
              Artwork blend {control.texMix.toFixed(2)}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={control.texMix}
                onChange={(e) => control.onTexMix(Number(e.target.value))}
              />
            </label>
          </>
        )}
      </Drawer>

      <Drawer title="New look" defaultOpen={false}>
        <button className="pg-btn w-full justify-center" disabled={control.shaderBusy} onClick={control.onGenerateShader}>
          {control.shaderBusy ? 'Creating…' : 'Ask for a new look'}
        </button>
        {control.shaderStatus && <p className="mt-1 text-[11px] text-subtle">{control.shaderStatus}</p>}
        {control.generatedCount > 0 && (
          <p className="mt-1 text-[11px] text-subtle">
            {control.generatedCount} new look{control.generatedCount === 1 ? '' : 's'} ready — the show can pick{' '}
            {control.generatedCount === 1 ? 'it' : 'them'} too
          </p>
        )}
      </Drawer>

      <Drawer title="Checks" defaultOpen={false}>
        <button className="pg-btn w-full justify-center" disabled={control.diag?.running} onClick={control.onCompileAll}>
          {control.diag?.running ? `Checking ${control.diag.checked}/${control.diag.total}…` : `Check all ${CATALOG.length} looks`}
        </button>
        {control.diag && !control.diag.running && control.diag.failures.length === 0 && control.diag.checked > 0 && (
          <p className="mt-1 text-[11px] text-accent">
            {control.diag.checked}/{control.diag.total} looks ready
          </p>
        )}
        {control.diag && control.diag.failures.length > 0 && (
          <ol className="mt-1 grid gap-1 text-[11px] text-red-300">
            {control.diag.failures.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ol>
        )}
        <button className="pg-btn mt-2 w-full justify-center" disabled={control.diag3d?.running} onClick={control.onCheck3D}>
          {control.diag3d?.running ? `Checking ${control.diag3d.checked}/${control.diag3d.total}…` : `Check all ${ORIGINALS.length} 3D scenes`}
        </button>
        {control.diag3d && !control.diag3d.running && control.diag3d.failures.length === 0 && control.diag3d.checked > 0 && (
          <p className="mt-1 text-[11px] text-accent">
            {control.diag3d.checked}/{control.diag3d.total} 3D scenes ready
          </p>
        )}
        {control.diag3d && control.diag3d.failures.length > 0 && (
          <ol className="mt-1 grid gap-1 text-[11px] text-red-300">
            {control.diag3d.failures.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ol>
        )}
      </Drawer>
    </div>
  );
}
