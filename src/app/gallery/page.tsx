'use client';

// M3 gallery: verifies + registers the five visualizers, then runs the
// picker, control panel, fps readout and auto-cycle. Mock audio by default,
// live mic features when an analyzer is attached. No theme pipeline.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ShaderDefinition } from '../../types';
import { LocalAudioAnalyzer, mockFeatures } from '../../inputs/audio/localAnalyzer';
import { Envelope, rawEnergy } from '../../inputs/audio/dsp';
import { Renderer, type RenderQuality } from '../../engine/renderer';
import { Crossfade } from '../../engine/transition';
import { FpsMonitor } from '../../engine/fps';
import {
  DEFAULT_VISUAL_PARAMS,
  PALETTE_PRESETS,
  customPalette,
  type VisualParams,
} from '../../engine/visualParams';
import { LIB_TAG, M3_TAG, registerVisualizer, type BenchReport } from '../../../shaders/verifyVisualizer';
import { hexCore } from '../../../shaders/m3/hex-core';
import { aegisScales } from '../../../shaders/m3/aegis-scales';
import { circuitVeins } from '../../../shaders/m3/circuit-veins';
import { warpTunnel } from '../../../shaders/m3/warp-tunnel';
import { prismBurst } from '../../../shaders/m3/prism-burst';
import { nanoHex } from '../../../shaders/batch0/nano-hex';
import { particleGalaxy } from '../../../shaders/batch0/particle-galaxy';
import { liquidMirror } from '../../../shaders/batch0/liquid-mirror';
import { emberField } from '../../../shaders/batch0/ember-field';
import { finalAscension } from '../../../shaders/batch0/final-ascension';
import { kineticColonnade } from '../../../shaders/batch0/kinetic-colonnade';
import { moltenDunes } from '../../../shaders/batch0/molten-dunes';
import { bassPortal } from '../../../shaders/batch0/bass-portal';
import { logDrumWaves } from '../../../shaders/batch1/log-drum-waves';
import { uliLines } from '../../../shaders/batch1/uli-lines';
import { adireIndigo } from '../../../shaders/batch1/adire-indigo';
import { ankaraKaleido } from '../../../shaders/batch1/ankara-kaleido';
import { lagosNightDrive } from '../../../shaders/batch1/lagos-night-drive';
import { talkingDrumRings } from '../../../shaders/batch1/talking-drum-rings';
import { goldDustHighlife } from '../../../shaders/batch1/gold-dust-highlife';
import { shekereBeads } from '../../../shaders/batch1/shekere-beads';
import { savannaSunsetPulse } from '../../../shaders/batch1/savanna-sunset-pulse';
import { masqueradeSpirit } from '../../../shaders/batch1/masquerade-spirit';
import ControlPanel, { type SliderKey } from './ControlPanel';
import { Button } from '../ui/controls';
import { font, ink, overlay, signal, size, space, tabular } from '../ui/theme';

const DEFS = [
  hexCore,
  aegisScales,
  circuitVeins,
  warpTunnel,
  prismBurst,
  nanoHex,
  particleGalaxy,
  liquidMirror,
  emberField,
  finalAscension,
  kineticColonnade,
  moltenDunes,
  bassPortal,
  logDrumWaves,
  uliLines,
  adireIndigo,
  ankaraKaleido,
  lagosNightDrive,
  talkingDrumRings,
  goldDustHighlife,
  shekereBeads,
  savannaSunsetPulse,
  masqueradeSpirit,
];
const AUTO_CYCLE_MS = 12000;

function prefersReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function defToExtra(def: ShaderDefinition): [number, number, number] {
  return [
    def.params?.[0]?.def ?? 0.5,
    def.params?.[1]?.def ?? 0.5,
    def.params?.[2]?.def ?? 0.5,
  ];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function Gallery() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const switchRef = useRef<(id: string) => void>(() => {});
  const [status, setStatus] = useState('Verifying visualizers…');
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<ShaderDefinition[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [params, setParams] = useState<VisualParams>(DEFAULT_VISUAL_PARAMS);
  const [preset, setPreset] = useState(0);
  const [custom, setCustom] = useState<[string, string, string]>(['#ff2d78', '#00e5ff', '#ffd166']);
  const [extra, setExtra] = useState<[number, number, number]>([1, 0.28, 1]);
  const [fps, setFps] = useState(0);
  const [scale, setScale] = useState(1);
  const [auto, setAuto] = useState(() => !prefersReduced());
  const [quality, setQuality] = useState<RenderQuality>(1);
  const [bench, setBench] = useState<Record<string, BenchReport>>({});
  const rendererRef = useRef<Renderer | null>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const paramsRef = useRef(params);
  paramsRef.current = params;
  const extraRef = useRef(extra);
  extraRef.current = extra;
  const autoRef = useRef(auto);
  autoRef.current = auto;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas);
      rendererRef.current = renderer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WebGL unavailable');
      return;
    }
    const audio = new LocalAudioAnalyzer();
    const fpsMon = new FpsMonitor();
    const fade = new Crossfade(prefersReduced() ? 0 : 600);
    let cancelled = false;
    let raf = 0;
    let ok: ShaderDefinition[] = [];
    let current: ShaderDefinition | null = null;
    let currentProg: WebGLProgram | null = null;
    let toProg: WebGLProgram | null = null;
    let pendingId: string | null = null;
    let pulse = 0;
    let lastSwitch = performance.now();
    let frame = 0;
    let lastT = 0;
    const env = new Envelope();

    switchRef.current = (id: string) => {
      pendingId = id;
    };

    const loop = () => {
      if (cancelled) return;
      const now = performance.now();
      const t = now / 1000;
      const p = paramsRef.current;
      const raw = audio.live ? audio.frame(now) : mockFeatures(t, now, p.bpm);
      const dtMs = lastT === 0 ? 1000 / 60 : Math.min(100, now - lastT);
      lastT = now;
      const f = {
        ...raw,
        bass: clamp01(raw.bass * p.sensitivity),
        mid: clamp01(raw.mid * p.sensitivity),
        high: clamp01(raw.high * p.sensitivity),
        // M6: uniforms ride a fast-attack/slow-release envelope of the raw
        // bands instead of the analyzer's heavily smoothed energy.
        energy: env.step(clamp01(rawEnergy(raw) * p.sensitivity), dtMs),
      };
      pulse += ((f.beat ? 1 : 0) - pulse) * (f.beat ? 0.55 : 0.07);

      if (autoRef.current && ok.length > 1 && now - lastSwitch > AUTO_CYCLE_MS && !pendingId) {
        const i = ok.findIndex((d) => d.id === current?.id);
        pendingId = ok[(i + 1) % ok.length].id;
      }
      if (pendingId && pendingId !== current?.id) {
        const def = ok.find((d) => d.id === pendingId);
        if (def) {
          const c = renderer.tryCompile(def);
          if ('prog' in c && currentProg) {
            toProg = c.prog;
            fade.begin(now);
            current = def;
            setActiveId(def.id);
          } else if ('prog' in c) {
            currentProg = c.prog;
            current = def;
            renderer.setShader(def);
            setActiveId(def.id);
          }
        }
        pendingId = null;
        lastSwitch = now;
      }

      const tick = fade.tick(now);
      const m = fpsMon.tick(now);
      if (tick && currentProg && toProg && current) {
        renderer.renderCrossfade(
          t, f, p.palette, p.intensity, p.speed, pulse, extraRef.current, m.scale,
          currentProg, toProg, tick.mix,
        );
        if (tick.done) {
          renderer.setShader(current);
          currentProg = toProg;
          toProg = null;
        }
      } else if (current) {
        renderer.renderVisual(t, f, p.palette, p.intensity, p.speed, pulse, extraRef.current, m.scale);
      }
      if (++frame % 30 === 0) {
        setFps(Math.round(m.fps));
        setScale(m.scale);
      }
      raf = requestAnimationFrame(loop);
    };

    (async () => {
      const passed: ShaderDefinition[] = [];
      for (let i = 0; i < DEFS.length; i++) {
        if (cancelled) return;
        setStatus(`Verifying ${DEFS[i].name} (${i + 1}/${DEFS.length})…`);
        const rep = (r: BenchReport) => setBench((b) => ({ ...b, [r.id]: r }));
        if (await registerVisualizer(DEFS[i], renderer, rep)) passed.push(DEFS[i]);
      }
      if (cancelled) return;
      if (passed.length === 0) {
        setError('No visualizers passed verification.');
        setStatus('');
        return;
      }
      ok = passed;
      setRegistered(passed);
      current = passed[0];
      const c = renderer.tryCompile(current);
      if (!('prog' in c)) {
        setError('Could not compile the first visualizer.');
        setStatus('');
        return;
      }
      currentProg = c.prog;
      renderer.setShader(current);
      setActiveId(current.id);
      setExtra(defToExtra(current));
      setStatus('');
      lastSwitch = performance.now();
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = registered.find((d) => d.id === activeId) ?? null;
  const failed = Object.values(bench).filter((r) => r.fps == null);

  const pick = (def: ShaderDefinition) => {
    setExtra(defToExtra(def));
    switchRef.current(def.id);
  };

  const onQuality = (q: RenderQuality) => {
    setQuality(q);
    const r = rendererRef.current;
    if (!r) return;
    r.setQuality(q);
    const id = activeIdRef.current;
    if (id) switchRef.current(id); // recompile current shader at the new quality
  };

  const onPreset = (i: number) => {
    setPreset(i);
    if (i >= 0) setParams((p) => ({ ...p, palette: [...PALETTE_PRESETS[i].colors] }));
    else setParams((p) => ({ ...p, palette: [...customPalette(custom)] }));
  };

  const onCustom = (c: [string, string, string]) => {
    setCustom(c);
    setParams((p) => ({ ...p, palette: [...customPalette(c)] }));
  };

  const onSlider = (key: SliderKey, v: number) => setParams((p) => ({ ...p, [key]: v }));

  const onExtra = (i: number, v: number) =>
    setExtra((e) => {
      const next = [...e] as [number, number, number];
      next[i] = v;
      return next;
    });

  return (
    <main style={styles.full}>
      <canvas ref={canvasRef} style={styles.canvas} />
      <div style={styles.left}>
        <h2 style={styles.head}>Gallery</h2>
        {status && <span style={styles.status}>{status}</span>}
        {error && <span style={styles.error}>{error}</span>}
        <div style={styles.picker}>
          {registered
            .filter((d) => d.tags?.includes(M3_TAG) || d.tags?.includes(LIB_TAG))
            .map((d) => (
              <Button
                key={d.id}
                kind={d.id === activeId ? 'active' : 'default'}
                onClick={() => pick(d)}
                style={styles.pick}
              >
                {bench[d.id]?.fps != null ? `${d.name} · ${Math.round(bench[d.id].fps!)}` : d.name}
              </Button>
            ))}
        </div>
        {failed.length > 0 && (
          <span style={styles.error}>Failed: {failed.map((r) => r.id).join(', ')}</span>
        )}
        <div style={styles.row}>
          <span style={styles.fps}>Quality</span>
          {([0, 1, 2] as RenderQuality[]).map((q) => (
            <Button
              key={q}
              kind={quality === q ? 'active' : 'default'}
              onClick={() => onQuality(q)}
              style={styles.pick}
            >
              {['Low', 'Med', 'High'][q]}
            </Button>
          ))}
        </div>
        <div style={styles.row}>
          <span style={styles.fps}>
            {fps} fps · scale {scale}
          </span>
          <label style={styles.auto}>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />{' '}
            Auto-cycle
          </label>
        </div>
      </div>
      <div style={styles.right}>
        <ControlPanel
          preset={preset}
          custom={custom}
          values={{ intensity: params.intensity, speed: params.speed, sensitivity: params.sensitivity, bpm: params.bpm }}
          visualName={active?.name ?? '—'}
          visualParams={active?.params ?? []}
          extra={extra}
          onPreset={onPreset}
          onCustom={onCustom}
          onSlider={onSlider}
          onExtra={onExtra}
        />
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  full: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: ink.bg },
  canvas: { width: '100%', height: '100%', display: 'block' },
  left: {
    ...overlay,
    position: 'absolute',
    left: 12,
    top: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    padding: '10px 12px',
    fontFamily: font.ui,
    fontSize: size.small,
    maxWidth: 300,
  },
  head: { fontSize: size.head, fontWeight: 700, margin: 0 },
  status: { color: ink.dim },
  right: { position: 'absolute', right: 12, top: 12, width: 300, color: ink.text },
  picker: { display: 'flex', flexDirection: 'column', gap: 4 },
  pick: { textAlign: 'left' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  fps: { fontFamily: font.mono, fontSize: size.data, color: ink.dim, ...tabular },
  auto: { display: 'flex', alignItems: 'center', gap: 4 },
  error: { color: signal.dangerText },
};
