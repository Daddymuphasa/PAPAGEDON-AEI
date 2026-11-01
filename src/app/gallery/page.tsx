'use client';

// M3 gallery: verifies + registers the five visualizers, then runs the
// picker, control panel, fps readout and auto-cycle. Mock audio by default,
// live mic features when an analyzer is attached. No theme pipeline.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ShaderDefinition, VisualDefinition } from '../../types';
import { isScene3D } from '../../types';
import { LocalAudioAnalyzer, mockFeatures } from '../../inputs/audio/localAnalyzer';
import { Envelope, rawEnergy } from '../../inputs/audio/dsp';
import { Renderer, type RenderQuality } from '../../engine/renderer';
import { Crossfade } from '../../engine/transition';
import { FpsMonitor } from '../../engine/fps';
import { StagePair } from '../../engine/stagePair';
import { registerScene } from '../../../scenes/registry';
import { planetRings3d } from '../../../scenes/pack3d/planet-rings-3d';
import { neonTunnel3d } from '../../../scenes/pack3d/neon-tunnel-3d';
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
import { strobeLattice } from '../../../shaders/batch2/strobe-lattice';
import { laserCathedral } from '../../../shaders/batch2/laser-cathedral';
import { acidFold } from '../../../shaders/batch2/acid-fold';
import { tranceHorizon } from '../../../shaders/batch2/trance-horizon';
import { infiniteCorridor } from '../../../shaders/batch2/infinite-corridor';
import { glitchGrid } from '../../../shaders/batch2/glitch-grid';
import { warehouseFog } from '../../../shaders/batch2/warehouse-fog';
import { hypnoSpiral } from '../../../shaders/batch2/hypno-spiral';
import { bassFracture } from '../../../shaders/batch2/bass-fracture';
import { euphoriaRays } from '../../../shaders/batch2/euphoria-rays';
import { heavenlyLight } from '../../../shaders/batch3/heavenly-light';
import { stainedGlassBloom } from '../../../shaders/batch3/stained-glass-bloom';
import { risingDoves } from '../../../shaders/batch3/rising-doves';
import { gloryClouds } from '../../../shaders/batch3/glory-clouds';
import { candleField } from '../../../shaders/batch3/candle-field';
import { rosePetalFall } from '../../../shaders/batch3/rose-petal-fall';
import { goldRingHalo } from '../../../shaders/batch3/gold-ring-halo';
import { silkRibbonDance } from '../../../shaders/batch3/silk-ribbon-dance';
import { crystalChandelier } from '../../../shaders/batch3/crystal-chandelier';
import { dawnBreaks } from '../../../shaders/batch3/dawn-breaks';
import { nebulaBreath } from '../../../shaders/batch4/nebula-breath';
import { auroraCurtain } from '../../../shaders/batch4/aurora-curtain';
import { blackHoleLens } from '../../../shaders/batch4/black-hole-lens';
import { starfieldWarp } from '../../../shaders/batch4/starfield-warp';
import { planetRings } from '../../../shaders/batch4/planet-rings';
import { oceanSwell } from '../../../shaders/batch4/ocean-swell';
import { rainforestCanopy } from '../../../shaders/batch4/rainforest-canopy';
import { lightningStorm } from '../../../shaders/batch4/lightning-storm';
import { lavaFlow } from '../../../shaders/batch4/lava-flow';
import { firefliesNight } from '../../../shaders/batch4/fireflies-night';
import { synthwaveSun } from '../../../shaders/batch5/synthwave-sun';
import { vhsGlitch } from '../../../shaders/batch5/vhs-glitch';
import { arcadePixels } from '../../../shaders/batch5/arcade-pixels';
import { boomboxBars } from '../../../shaders/batch5/boombox-bars';
import { graffitiDrip } from '../../../shaders/batch5/graffiti-drip';
import { vinylSpin } from '../../../shaders/batch5/vinyl-spin';
import { festivalLasers } from '../../../shaders/batch5/festival-lasers';
import { confettiBurst } from '../../../shaders/batch5/confetti-burst';
import { fireworkBloom } from '../../../shaders/batch5/firework-bloom';
import { mainStageWall } from '../../../shaders/batch5/main-stage-wall';
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
  strobeLattice,
  laserCathedral,
  acidFold,
  tranceHorizon,
  infiniteCorridor,
  glitchGrid,
  warehouseFog,
  hypnoSpiral,
  bassFracture,
  euphoriaRays,
  heavenlyLight,
  stainedGlassBloom,
  risingDoves,
  gloryClouds,
  candleField,
  rosePetalFall,
  goldRingHalo,
  silkRibbonDance,
  crystalChandelier,
  dawnBreaks,
  nebulaBreath,
  auroraCurtain,
  blackHoleLens,
  starfieldWarp,
  planetRings,
  oceanSwell,
  rainforestCanopy,
  lightningStorm,
  lavaFlow,
  firefliesNight,
  synthwaveSun,
  vhsGlitch,
  arcadePixels,
  boomboxBars,
  graffitiDrip,
  vinylSpin,
  festivalLasers,
  confettiBurst,
  fireworkBloom,
  mainStageWall,
];

const SCENES = [planetRings3d, neonTunnel3d];

// Pack structure (papagedon.com/app lesson: a flat list of 60+ scenes is
// unnavigable; packs + number keys make every shader reachable).
const PACKS: { id: string; name: string; ids: string[] }[] = [
  { id: 'all', name: 'All', ids: [] },
  {
    id: 'm3',
    name: 'M3 Originals',
    ids: ['hex-core', 'aegis-scales', 'circuit-veins', 'warp-tunnel', 'prism-burst'],
  },
  {
    id: 'batch0',
    name: 'Batch 0 · Papagedon',
    ids: [
      'nano-hex',
      'particle-galaxy',
      'liquid-mirror',
      'ember-field',
      'final-ascension',
      'kinetic-colonnade',
      'molten-dunes',
      'bass-portal',
    ],
  },
  {
    id: 'batch1',
    name: 'Batch 1 · Afro',
    ids: [
      'log-drum-waves',
      'uli-lines',
      'adire-indigo',
      'ankara-kaleido',
      'lagos-night-drive',
      'talking-drum-rings',
      'gold-dust-highlife',
      'shekere-beads',
      'savanna-sunset-pulse',
      'masquerade-spirit',
    ],
  },
  {
    id: 'batch2',
    name: 'Batch 2 · Club',
    ids: [
      'strobe-lattice',
      'laser-cathedral',
      'acid-fold',
      'trance-horizon',
      'infinite-corridor',
      'glitch-grid',
      'warehouse-fog',
      'hypno-spiral',
      'bass-fracture',
      'euphoria-rays',
    ],
  },
  {
    id: 'batch3',
    name: 'Batch 3 · Wedding',
    ids: [
      'heavenly-light',
      'stained-glass-bloom',
      'rising-doves',
      'glory-clouds',
      'candle-field',
      'rose-petal-fall',
      'gold-ring-halo',
      'silk-ribbon-dance',
      'crystal-chandelier',
      'dawn-breaks',
    ],
  },
  {
    id: 'batch4',
    name: 'Batch 4 · Cosmic',
    ids: [
      'nebula-breath',
      'aurora-curtain',
      'black-hole-lens',
      'starfield-warp',
      'planet-rings',
      'ocean-swell',
      'rainforest-canopy',
      'lightning-storm',
      'lava-flow',
      'fireflies-night',
    ],
  },
  {
    id: 'batch5',
    name: 'Batch 5 · Retro',
    ids: [
      'synthwave-sun',
      'vhs-glitch',
      'arcade-pixels',
      'boombox-bars',
      'graffiti-drip',
      'vinyl-spin',
      'festival-lasers',
      'confetti-burst',
      'firework-bloom',
      'main-stage-wall',
    ],
  },
  {
    id: 'pack3d',
    name: 'Pack 3D · True 3D',
    ids: ['planet-rings-3d', 'neon-tunnel-3d'],
  },
];
const AUTO_CYCLE_MS = 12000;

function prefersReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function defToExtra(def: VisualDefinition): [number, number, number] {
  return [
    def.params?.[0]?.def ?? 0.5,
    def.params?.[1]?.def ?? 0.5,
    def.params?.[2]?.def ?? 0.5,
  ];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function Gallery() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const switchRef = useRef<(id: string) => void>(() => {});
  const [status, setStatus] = useState('Verifying visualizers…');
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<VisualDefinition[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [params, setParams] = useState<VisualParams>(DEFAULT_VISUAL_PARAMS);
  const [preset, setPreset] = useState(0);
  const [custom, setCustom] = useState<[string, string, string]>(['#ff2d78', '#00e5ff', '#ffd166']);
  const [extra, setExtra] = useState<[number, number, number]>([1, 0.28, 1]);
  const [fps, setFps] = useState(0);
  const [scale, setScale] = useState(1);
  const [auto, setAuto] = useState(() => !prefersReduced());
  const [quality, setQuality] = useState<RenderQuality>(1);
  const [pack, setPack] = useState('all');
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
    const threeCanvas = threeCanvasRef.current;
    if (!canvas || !threeCanvas) return;
    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas);
      rendererRef.current = renderer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WebGL unavailable');
      return;
    }
    for (const s of SCENES) registerScene(s);
    const pair = new StagePair(canvas, threeCanvas);
    const audio = new LocalAudioAnalyzer();
    const fpsMon = new FpsMonitor();
    const fade = new Crossfade(prefersReduced() ? 0 : 600);
    let cancelled = false;
    let raf = 0;
    let ok: VisualDefinition[] = [];
    let current: VisualDefinition | null = null;
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
        if (def && isScene3D(def)) {
          pair.request(def.id, () => {});
          current = def;
          setActiveId(def.id);
        } else if (def) {
          const frag = def as ShaderDefinition;
          const c = renderer.tryCompile(frag);
          if ('prog' in c) {
            pair.request(frag.id, () => {
              if (currentProg) {
                toProg = c.prog;
                fade.begin(now);
              } else {
                currentProg = c.prog;
                renderer.setShader(frag);
              }
            });
            current = frag;
            setActiveId(frag.id);
          }
        }
        pendingId = null;
        lastSwitch = now;
      }

      const tick = fade.tick(now);
      const m = fpsMon.tick(now);
      const backend = pair.frame(now);
      if (backend === 'three' && current) {
        pair.renderThree(t, f, p.palette, p.intensity, p.speed, pulse, extraRef.current, m.scale, 0);
      } else if (tick && currentProg && toProg && current && !isScene3D(current)) {
        renderer.renderCrossfade(
          t, f, p.palette, p.intensity, p.speed, pulse, extraRef.current, m.scale,
          currentProg, toProg, tick.mix,
        );
        if (tick.done) {
          renderer.setShader(current);
          currentProg = toProg;
          toProg = null;
        }
      } else if (current && !isScene3D(current)) {
        renderer.renderVisual(t, f, p.palette, p.intensity, p.speed, pulse, extraRef.current, m.scale);
      } else if (current) {
        pair.renderThree(t, f, p.palette, p.intensity, p.speed, pulse, extraRef.current, m.scale, 0);
      }
      if (++frame % 30 === 0) {
        setFps(Math.round(m.fps));
        setScale(m.scale);
      }
      raf = requestAnimationFrame(loop);
    };

    (async () => {
      const passed: VisualDefinition[] = [];
      for (let i = 0; i < DEFS.length; i++) {
        if (cancelled) return;
        setStatus(`Verifying ${DEFS[i].name} (${i + 1}/${DEFS.length})…`);
        const rep = (r: BenchReport) => setBench((b) => ({ ...b, [r.id]: r }));
        if (await registerVisualizer(DEFS[i], renderer, rep)) passed.push(DEFS[i]);
      }
      for (const s of SCENES) {
        if (cancelled) return;
        if (pair.three === null) break;
        setStatus(`Verifying ${s.name}…`);
        try {
          pair.three.setScene(s);
          passed.push(s);
        } catch {
          // A scene that cannot build stays out of the gallery.
        }
      }
      if (cancelled) return;
      if (passed.length === 0) {
        setError('No visualizers passed verification.');
        setStatus('');
        return;
      }
      ok = passed;
      setRegistered(passed);
      const firstFrag = passed.find((d) => !isScene3D(d));
      const first = firstFrag ?? passed[0];
      current = first;
      if (!isScene3D(first)) {
        const c = renderer.tryCompile(first);
        if (!('prog' in c)) {
          setError('Could not compile the first visualizer.');
          setStatus('');
          return;
        }
        currentProg = c.prog;
        renderer.setShader(first);
      } else if (pair.three !== null) {
        pair.three.setScene(first);
      }
      setActiveId(first.id);
      setExtra(defToExtra(first));
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

  const pick = (def: VisualDefinition) => {
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

  // papagedon.com/app lesson: number keys pick scenes, A toggles auto-cycle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'a' || e.key === 'A') {
        setAuto((a) => !a);
        return;
      }
      const n = e.key >= '0' && e.key <= '9' ? Number(e.key) : -1;
      if (n < 0) return;
      const idx = (n + 9) % 10; // 1-9,0 -> 0-9
      const table = PACKS.find((p) => p.id === pack) ?? PACKS[0];
      const members = registered.filter(
        (d) =>
          (d.tags?.includes(M3_TAG) || d.tags?.includes(LIB_TAG)) &&
          (table.id === 'all' || table.ids.includes(d.id)),
      );
      const def = members[idx];
      if (def) {
        setExtra(defToExtra(def));
        switchRef.current(def.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [registered, pack]);

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
      <canvas ref={threeCanvasRef} style={styles.canvasThree} />
      <div style={styles.left}>
        <h2 style={styles.head}>Gallery</h2>
        {status && <span style={styles.status}>{status}</span>}
        {error && <span style={styles.error}>{error}</span>}
        <div style={styles.row}>
          {PACKS.map((p) => (
            <Button
              key={p.id}
              kind={pack === p.id ? 'active' : 'default'}
              onClick={() => setPack(p.id)}
              style={styles.pick}
            >
              {p.id === 'all' ? 'All' : p.name}
            </Button>
          ))}
        </div>
        <div style={styles.picker}>
          {PACKS.filter((p) => pack === 'all' || pack === p.id).map((p) => {
            const members = registered.filter(
              (d) =>
                (d.tags?.includes(M3_TAG) || d.tags?.includes(LIB_TAG)) &&
                (p.id === 'all' || p.ids.includes(d.id)),
            );
            if (members.length === 0) return null;
            return (
              <div key={p.id} style={styles.packGroup}>
                {pack === 'all' && <span style={styles.packHead}>{p.name}</span>}
                {members.map((d, i) => (
                  <Button
                    key={d.id}
                    kind={d.id === activeId ? 'active' : 'default'}
                    onClick={() => pick(d)}
                    style={styles.pick}
                  >
                    {pack !== 'all' && i < 10 ? `${(i + 1) % 10} · ` : ''}
                    {bench[d.id]?.fps != null ? `${d.name} · ${Math.round(bench[d.id].fps!)}` : d.name}
                  </Button>
                ))}
              </div>
            );
          })}
        </div>
        <span style={styles.dim}>keys 1–0 pick · A auto-cycle</span>
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
  canvasThree: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'none',
  },
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
  packGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  packHead: { fontSize: size.data, fontWeight: 700, color: ink.dim, marginTop: 6 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  fps: { fontFamily: font.mono, fontSize: size.data, color: ink.dim, ...tabular },
  auto: { display: 'flex', alignItems: 'center', gap: 4 },
  error: { color: signal.dangerText },
};
