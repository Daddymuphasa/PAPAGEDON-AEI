'use client';

// M4 laptop view: decision log, scene + reason, planner countdown, arc and
// events, meters, credit guard, mode badge, theme, override panel, sources.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { EventTheme, SectionKind, TrackMap } from '../../../types';
import { withBasePath } from '../../../basePath';
import { mockTheme } from '../../../meta/mock';
import { LocalAudioAnalyzer, mockFeatures } from '../../../inputs/audio/localAnalyzer';
import { downscaleImage } from '../../../inputs/flyer/flyer';
import { extractVerifiedTheme } from '../../../inputs/flyer/applyTheme';
import { ShowDirector, type DirectorView } from '../../../director/showDirector';
import { mockTrackMap, verifyTrackMap } from '../../../director/trackMap';
import {
  FILE_MAX_BYTES,
  HEARTBEAT_MS,
  START_DELAY_MS,
  ShowBus,
  type BusMessage,
  type ShowSource,
} from '../../../director/showBus';
import {
  getCredits,
  resetCredits,
  setCallCap,
  setTokenCap,
  subscribeCredits,
  totalTokens,
  type CreditState,
} from '../../../director/credit';
import { PALETTE_PRESETS, customPalette } from '../../../engine/visualParams';
import { hexCore } from '../../../../shaders/m3/hex-core';
import { aegisScales } from '../../../../shaders/m3/aegis-scales';
import { circuitVeins } from '../../../../shaders/m3/circuit-veins';
import { warpTunnel } from '../../../../shaders/m3/warp-tunnel';
import { prismBurst } from '../../../../shaders/m3/prism-burst';
import ControlPanel, { type SliderKey } from '../../gallery/ControlPanel';
import DecisionLogPanel from '../../components/DecisionLogPanel';
import { Badge, Button, MeterBar } from '../../ui/controls';
import { font, ink, input, panel, signal, size, space, tabular } from '../../ui/theme';

const DEFS = [hexCore, aegisScales, circuitVeins, warpTunnel, prismBurst];

const SEG_COLORS: Record<SectionKind, string> = {
  intro: ink.faint,
  build: signal.warn,
  drop: signal.live,
  breakdown: signal.info,
  outro: ink.faint,
};

export default function ShowControl() {
  const directorRef = useRef<ShowDirector | null>(null);
  const analyzerRef = useRef<LocalAudioAnalyzer | null>(null);
  const busRef = useRef<ShowBus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const flyerInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<DirectorView | null>(null);
  const [theme, setTheme] = useState<EventTheme>(mockTheme);
  const [preset, setPreset] = useState(0);
  const [custom, setCustom] = useState<[string, string, string]>(['#ff2d78', '#00e5ff', '#ffd166']);
  const [sensitivity, setSensitivity] = useState(1);
  const [bpm, setBpm] = useState(126);
  const [credits, setCredits] = useState<CreditState>(() => getCredits());
  const [pktRate, setPktRate] = useState(0);
  const [outStats, setOutStats] = useState<{ fps: number; ms: number } | null>(null);
  const [mode, setMode] = useState<{ live: boolean; model: string } | null>(null);
  const [source, setSource] = useState<ShowSource>('mock');
  const [fileName, setFileName] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [blackout, setBlackout] = useState(false);
  const [flyerBusy, setFlyerBusy] = useState(false);
  const [flyerError, setFlyerError] = useState<string | null>(null);
  const [trackStatus, setTrackStatus] = useState<'analyzing' | 'ready' | 'unavailable'>('unavailable');
  const [trackMap, setTrackMapState] = useState<TrackMap | null>(null);

  const themeRef = useRef(theme);
  themeRef.current = theme;
  const audioRef = useRef({ source: 'mock' as ShowSource, bpm: 126, t0: 0, fileName: null as string | null });
  const fluxHist = useRef<number[]>([]);
  const beatUntil = useRef(0);
  const seqRef = useRef(0);
  const postTimes = useRef<number[]>([]);
  const mapSeq = useRef(0);

  useEffect(() => {
    const bus = new ShowBus();
    bus.open();
    busRef.current = bus;
    if (!analyzerRef.current) analyzerRef.current = new LocalAudioAnalyzer();
    const analyzer = analyzerRef.current;
    const director = new ShowDirector({
      bus,
      defs: DEFS,
      getTheme: () => themeRef.current,
      onUpdate: setView,
    });
    directorRef.current = director;
    const t0 = performance.now();
    audioRef.current = { source: 'mock', bpm: 126, t0, fileName: null };
    director.setAudio('mock', 126, t0, null);
    const mock = mockTrackMap();
    director.setTrackMap(mock);
    setTrackMapState(mock);
    setTrackStatus('ready');
    bus.onMessage = (m: BusMessage) => {
      if (m.t === 'ready') bus.post({ t: 'state', state: director.snapshot() });
      else if (m.t === 'outStats') setOutStats({ fps: m.fps, ms: Math.round(m.msSincePacket) });
    };
    const hb = window.setInterval(() => {
      bus.post({ t: 'alive', now: Date.now() });
      const cutoff = performance.now() - 1000;
      postTimes.current = postTimes.current.filter((t) => t >= cutoff);
      setPktRate(postTimes.current.length);
    }, HEARTBEAT_MS);
    fetch(withBasePath('/api/mode'))
      .then((r) => r.json())
      .then((m) => setMode(m as { live: boolean; model: string }))
      .catch(() => setMode({ live: false, model: 'muse-spark-1.3' }));
    let raf = 0;
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      const now = performance.now();
      const a = audioRef.current;
      const f =
        a.source === 'mock' || !analyzer.live
          ? mockFeatures((now - a.t0) / 1000, now, a.bpm)
          : { ...analyzer.frame(now), bpm: a.bpm };
      bus.post({
        t: 'feat',
        seq: seqRef.current++,
        ts: now,
        bass: f.bass,
        subBass: f.subBass,
        mid: f.mid,
        high: f.high,
        energy: f.energy,
        flux: f.flux,
        beat: f.beat,
        beatConfidence: f.beatConfidence,
        bpm: f.bpm,
        buildUp: f.buildUp,
        drop: f.drop,
      });
      postTimes.current.push(now);
      director.frame(f, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearInterval(hb);
      bus.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => subscribeCredits(() => setCredits({ ...getCredits() })), []);

  useEffect(() => {
    if (!view) return;
    fluxHist.current = [...fluxHist.current, view.meters.flux].slice(-60);
    if (view.meters.beat) beatUntil.current = performance.now() + 180;
  }, [view]);

  // Audio element + mic refs live outside the mount effect for handlers.
  const sharedRef = useRef<{ ctx: AudioContext | null; el: HTMLAudioElement | null; mic: MediaStream | null }>({
    ctx: null,
    el: null,
    mic: null,
  });

  const ensureCtx = () => {
    if (!sharedRef.current.ctx) sharedRef.current.ctx = new AudioContext();
    if (sharedRef.current.ctx.state === 'suspended') void sharedRef.current.ctx.resume();
    return sharedRef.current.ctx;
  };

  const pushAudio = (source: ShowSource, bpmValue: number, file: string | null, at?: number) => {
    const t0 = at ?? performance.now();
    audioRef.current = { source, bpm: bpmValue, t0, fileName: file };
    directorRef.current?.setAudio(source, bpmValue, t0, file);
    busRef.current?.post({ t: 'audio', source, bpm: bpmValue, t0 });
  };

  const pickSource = async (s: ShowSource) => {
    setAudioError(null);
    if (s === 'file') {
      fileInputRef.current?.click();
      return;
    }
    sharedRef.current.mic?.getTracks().forEach((t) => t.stop());
    sharedRef.current.mic = null;
    sharedRef.current.el?.pause();
    if (s === 'mic') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        sharedRef.current.mic = stream;
        analyzerRef.current?.attach(stream, ensureCtx());
      } catch {
        setAudioError('Mic blocked — allow the microphone and retry.');
        return;
      }
    }
    setSource(s);
    setFileName(null);
    pushAudio(s, bpm, null);
    if (s === 'mock') {
      const mock = mockTrackMap();
      directorRef.current?.setTrackMap(mock);
      setTrackMapState(mock);
      setTrackStatus('ready');
    } else {
      mapSeq.current += 1; // drop any in-flight file analysis
      directorRef.current?.setTrackMap(null);
      setTrackMapState(null);
      setTrackStatus('unavailable');
    }
  };

  // M5: send file bytes for whole-track pre-analysis. Stale responses
  // (user switched source or track meanwhile) are ignored via mapSeq.
  // Any failure leaves live analysis running with no map.
  const requestTrackMap = async (bytes: ArrayBuffer) => {
    const seq = ++mapSeq.current;
    directorRef.current?.setTrackMap(null);
    setTrackMapState(null);
    setTrackStatus('analyzing');
    try {
      const res = await fetch(withBasePath('/api/track/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes,
      });
      const data = (await res.json()) as { ok: boolean; map?: unknown };
      if (seq !== mapSeq.current) return;
      if (data.ok && data.map !== undefined && verifyTrackMap(data.map).ok) {
        const map = data.map as TrackMap;
        directorRef.current?.setTrackMap(map);
        setTrackMapState(map);
        setTrackStatus('ready');
      } else {
        setTrackStatus('unavailable');
      }
    } catch {
      if (seq === mapSeq.current) setTrackStatus('unavailable');
    }
  };

  const onFileChosen = async (file: File) => {
    setAudioError(null);
    if (file.size > FILE_MAX_BYTES) {
      setAudioError(`File too large (max ${Math.round(FILE_MAX_BYTES / 1024 / 1024)}MB).`);
      return;
    }
    try {
      const bytes = await file.arrayBuffer();
      sharedRef.current.mic?.getTracks().forEach((t) => t.stop());
      sharedRef.current.mic = null;
      sharedRef.current.el?.pause();
      const el = new Audio(URL.createObjectURL(new Blob([bytes], { type: file.type || 'audio/*' })));
      el.preload = 'auto';
      sharedRef.current.el = el;
      analyzerRef.current?.attachElement(el, ensureCtx(), true);
      const t0 = performance.now() + START_DELAY_MS;
      setSource('file');
      setFileName(file.name);
      pushAudio('file', bpm, file.name, t0);
      void requestTrackMap(bytes);
      window.setTimeout(() => {
        void el.play().catch(() => setAudioError('Could not play that file.'));
      }, Math.max(0, t0 - performance.now()));
    } catch {
      setAudioError('Could not play that file.');
    }
  };

  const onFlyer = async (file: File) => {
    setFlyerError(null);
    setFlyerBusy(true);
    try {
      const dataUrl = await downscaleImage(file);
      const res = await extractVerifiedTheme(dataUrl);
      if (!res.ok || !res.theme) {
        setFlyerError(res.errors[0] ?? 'verification failed');
        return;
      }
      const next = res.theme;
      setTheme(next);
      const mid = Math.round((next.tempoBpm.min + next.tempoBpm.max) / 2);
      setBpm(mid);
      pushAudio(source, mid, fileName);
      directorRef.current?.opening(next);
    } catch (err) {
      setFlyerError(err instanceof Error ? err.message : 'verification failed');
    } finally {
      setFlyerBusy(false);
    }
  };

  const live = view?.live ?? { intensity: 0.7, speed: 1, extra: [1, 0.28, 1] as [number, number, number] };
  const activeDef = DEFS.find((d) => d.id === view?.visualId) ?? DEFS[0];
  // Track clock for the map playhead; re-derived every render (10 Hz via view).
  const trackT = Math.max(0, (performance.now() - audioRef.current.t0) / 1000);
  const trackPct = trackMap === null ? 0 : Math.min(100, Math.max(0, (trackT / trackMap.durationS) * 100));

  return (
    <main style={styles.page}>
      <header style={styles.head}>
        <h1 style={styles.title}>PAPAGEDON AEI — Show Control</h1>
        <Badge tone={mode?.live ? 'live' : 'muted'}>
          {mode === null ? '…' : mode.live ? `LIVE · ${mode.model}` : 'MOCK · no keys'}
        </Badge>
        <span style={styles.theme}>
          {view?.themeName ?? theme.eventName}{' '}
          {theme.palette.map((c) => (
            <span key={c} title={c} style={{ ...styles.swatch, background: c }} />
          ))}
        </span>
      </header>

      <section style={styles.scene}>
        <div>
          <div style={styles.sceneName}>{view?.sceneName ?? '—'}</div>
          <div style={styles.reason}>{view?.reason ?? 'Starting…'}</div>
        </div>
        <div style={styles.stats}>
          <span>Arc: {view?.arc ?? '—'}</span>
          <span>Events: {view && view.events.length > 0 ? view.events.join(', ') : '—'}</span>
          <span>Next Muse call: {view?.plannerBusy ? 'calling…' : `${view?.countdownS ?? 0}s`}</span>
          {view !== null && view.manualHoldS > 0 && <span>Manual hold: {view.manualHoldS.toFixed(0)}s</span>}
        </div>
      </section>

      <div style={styles.grid} className="aei-grid-2col">
        <div style={styles.col}>
          <section style={styles.card}>
            <h2 style={styles.cardHead}>Audio meters + detection</h2>
            {(['subBass', 'bass', 'mid', 'high', 'energy'] as const).map((k) => (
              <MeterBar key={k} label={k} value={view?.meters[k] ?? 0} />
            ))}
            <div style={styles.meterRow}>
              <span style={styles.fluxLabel}>flux</span>
              <svg viewBox="0 0 60 20" preserveAspectRatio="none" style={styles.fluxBox}>
                <polyline
                  points={fluxHist.current
                    .map((v, i) => {
                      const peak = Math.max(0.01, ...fluxHist.current);
                      return `${i},${(20 - (v / peak) * 18).toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#ffd166"
                  strokeWidth="1"
                />
              </svg>
            </div>
            <div style={styles.row}>
              <span
                title="beat"
                style={{
                  ...styles.beat,
                  background: performance.now() < beatUntil.current ? signal.live : ink.raised,
                }}
              />
              <span>BPM {view?.meters.bpm ?? 0}</span>
              <span>conf {(view?.meters.beatConfidence ?? 0).toFixed(2)}</span>
            </div>
            <div style={styles.row}>
              <span>stream {pktRate} Hz</span>
              <span>out {outStats === null ? '—' : `${outStats.fps} fps · ${outStats.ms} ms old`}</span>
            </div>
            <div style={styles.row}>
              <span>Source:</span>
              {(['mic', 'file', 'mock'] as const).map((s) => (
                <Button key={s} kind={s === source ? 'active' : 'default'} onClick={() => void pickSource(s)}>
                  {s === 'mock' ? `mock ${bpm}` : s}
                </Button>
              ))}
              {fileName !== null && source === 'file' && <span style={styles.dim}>{fileName}</span>}
            </div>
            <div style={styles.row}>
              <span>Track map:</span>
              <span
                style={
                  trackStatus === 'ready'
                    ? styles.mapReady
                    : trackStatus === 'analyzing'
                      ? styles.mapBusy
                      : styles.dim
                }
              >
                {trackStatus}
              </span>
              {trackMap !== null && (
                <span style={styles.dim}>
                  {trackMap.durationS.toFixed(0)}s · {trackMap.bpm.toFixed(0)} bpm
                </span>
              )}
            </div>
            {trackMap !== null && (
              <div style={styles.timeline} title="track sections with playhead">
                {trackMap.sections.map((s, i) => (
                  <span
                    key={i}
                    title={`${s.kind} ${s.start.toFixed(0)}–${s.end.toFixed(0)}s`}
                    style={{
                      ...styles.seg,
                      flexGrow: Math.max(0.001, s.end - s.start),
                      background: SEG_COLORS[s.kind],
                    }}
                  />
                ))}
                <span style={{ ...styles.playhead, left: `${trackPct}%` }} />
              </div>
            )}
            {audioError !== null && <span style={styles.error}>{audioError}</span>}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && void onFileChosen(e.target.files[0])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardHead}>Manual override</h2>
            <ControlPanel
              preset={preset}
              custom={custom}
              values={{ intensity: live.intensity, speed: live.speed, sensitivity, bpm }}
              visualName={activeDef.name}
              visualParams={activeDef.params ?? []}
              extra={live.extra}
              bare
              onPreset={(i) => {
                setPreset(i);
                const pal = i >= 0 ? [...PALETTE_PRESETS[i].colors] : [...customPalette(custom)];
                directorRef.current?.manual({ palette: pal });
              }}
              onCustom={(c) => {
                setCustom(c);
                if (preset === -1) directorRef.current?.manual({ palette: [...customPalette(c)] });
              }}
              onSlider={(key: SliderKey, v: number) => {
                if (key === 'intensity') directorRef.current?.manual({ intensity: v });
                else if (key === 'speed') directorRef.current?.manual({ speed: v });
                else if (key === 'sensitivity') {
                  setSensitivity(v);
                  if (directorRef.current) directorRef.current.sensitivity = v;
                  directorRef.current?.manual({});
                } else {
                  setBpm(v);
                  pushAudio(source, v, fileName);
                  directorRef.current?.manual({});
                }
              }}
              onExtra={(i, v) => {
                const next = [...live.extra] as [number, number, number];
                next[i] = v;
                directorRef.current?.manual({ extra: next });
              }}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardHead}>Theme + blackout</h2>
            <div style={styles.row}>
              <Button onClick={() => flyerInputRef.current?.click()} disabled={flyerBusy}>
                {flyerBusy ? 'Verifying…' : 'Load flyer'}
              </Button>
              <Button
                kind={blackout ? 'danger' : 'default'}
                onClick={() => {
                  const next = !blackout;
                  setBlackout(next);
                  directorRef.current?.setBlackout(next);
                }}
              >
                {blackout ? 'RELEASE BLACKOUT' : 'Blackout'}
              </Button>
            </div>
            {flyerError !== null && <span style={styles.error}>{flyerError}</span>}
            <input
              ref={flyerInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && void onFlyer(e.target.files[0])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardHead}>Credit guard</h2>
            <div style={styles.row}>
              <span>
                {credits.calls} calls · {totalTokens(credits)} tokens ({credits.mockCalls} mock)
              </span>
              <Button
                onClick={() => {
                  resetCredits();
                  directorRef.current?.noteCapReset();
                }}
              >
                Reset session
              </Button>
            </div>
            <div style={styles.row}>
              <label>
                Call cap:{' '}
                <input
                  type="number"
                  min={1}
                  value={credits.callCap}
                  onChange={(e) => setCallCap(Number(e.target.value) || 1)}
                  style={styles.num}
                />
              </label>
              <label>
                Token cap (blank = none):{' '}
                <input
                  type="number"
                  min={1}
                  value={credits.tokenCap ?? ''}
                  placeholder="none"
                  onChange={(e) => setTokenCap(e.target.value === '' ? null : Number(e.target.value) || 1)}
                  style={styles.num}
                />
              </label>
            </div>
            {credits.capped && <span style={styles.error}>Cap reached — local layer only.</span>}
          </section>
        </div>

        <div style={styles.col}>
          <DecisionLogPanel colored title="Live decision log" empty="No show decisions yet." />
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: ink.bg,
    color: ink.text,
    fontFamily: font.ui,
    fontSize: size.body,
    padding: space.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    maxWidth: 1440,
    margin: '0 auto',
  },
  head: { display: 'flex', alignItems: 'center', gap: space.lg, flexWrap: 'wrap' },
  title: { fontSize: size.title, fontWeight: 800, letterSpacing: -0.25, margin: 0 },
  theme: { display: 'flex', alignItems: 'center', gap: 6, color: ink.dim, fontSize: size.small },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 4,
    border: `1px solid ${ink.line}`,
    display: 'inline-block',
  },
  scene: {
    ...panel,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.lg,
    padding: '12px 16px',
    flexWrap: 'wrap',
  },
  sceneName: { fontSize: 28, fontWeight: 800, letterSpacing: -0.25 },
  reason: { color: ink.dim, marginTop: 4 },
  stats: {
    display: 'flex',
    gap: 20,
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: size.body,
    ...tabular,
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space.md, alignItems: 'start' },
  col: { display: 'flex', flexDirection: 'column', gap: space.md, minWidth: 0 },
  card: {
    ...panel,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontSize: size.body,
  },
  cardHead: { fontSize: size.head, fontWeight: 700, margin: 0 },
  row: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  dim: { color: ink.dim },
  error: { color: signal.dangerText },
  num: { ...input, width: 90 },
  meterRow: { display: 'flex', alignItems: 'center', gap: 8 },
  fluxLabel: { width: 64, fontFamily: font.mono, fontSize: size.data, color: ink.dim },
  fluxBox: { flex: 1, height: 28, background: '#0d0d0d', borderRadius: 6, minWidth: 0 },
  beat: { width: 22, height: 22, borderRadius: 11, display: 'inline-block' },
  mapReady: { color: signal.ok },
  mapBusy: { color: signal.warn },
  timeline: {
    position: 'relative',
    display: 'flex',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    background: '#0d0d0d',
  },
  seg: { display: 'inline-block', height: '100%', flexBasis: 0 },
  playhead: { position: 'absolute', top: 0, bottom: 0, width: 2, background: '#fff' },
};
