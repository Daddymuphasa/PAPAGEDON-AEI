'use client';

// M4 laptop view: decision log, scene + reason, planner countdown, arc and
// events, meters, credit guard, mode badge, theme, override panel, sources.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AudioFeatures, EventImage, EventTheme, SectionKind, SegResultData, TextureMeta, TrackMap, VisionSignals } from '../../../types';
import { withBasePath } from '../../../basePath';
import { mockTheme } from '../../../meta/mock';
import { DEFAULT_IMAGE_COUNT, tagsForCount } from '../../../visuals/prompts';
import { generateEventVisuals } from '../../../visuals/generate';
import { DEFAULT_TEX_MIX } from '../../../director/texturePick';
import { LocalAudioAnalyzer, mockFeatures, type CalibrationState } from '../../../inputs/audio/localAnalyzer';
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
  type SegPayload,
  type ShowSnapshot,
  type ShowSource,
} from '../../../director/showBus';
import { logDecision } from '../../../director/decisionLog';
import { VisionTickState } from '../../../vision/client';
import { decodeGrid } from '../../../vision/signals';
import { NO_SEG, Renderer, type SegUniforms } from '../../../engine/renderer';
import { SegEaser } from '../../../vision/segEase';
import { STANDBY_WORKLET_SRC, shouldDriveFromStandby } from '../../../inputs/audio/hiddenDriver';
import { audioStateLabel, resumeAudioContext, type AudioState } from '../../../inputs/audio/audioContext';
import { cameraErrorMessage, waitForFrames } from '../../../vision/cameraStatus';
import { Envelope, rawEnergy } from '../../../inputs/audio/dsp';
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
import { nanoHex } from '../../../../shaders/batch0/nano-hex';
import { particleGalaxy } from '../../../../shaders/batch0/particle-galaxy';
import { liquidMirror } from '../../../../shaders/batch0/liquid-mirror';
import { emberField } from '../../../../shaders/batch0/ember-field';
import { finalAscension } from '../../../../shaders/batch0/final-ascension';
import { kineticColonnade } from '../../../../shaders/batch0/kinetic-colonnade';
import { moltenDunes } from '../../../../shaders/batch0/molten-dunes';
import { bassPortal } from '../../../../shaders/batch0/bass-portal';
import { logDrumWaves } from '../../../../shaders/batch1/log-drum-waves';
import { uliLines } from '../../../../shaders/batch1/uli-lines';
import { adireIndigo } from '../../../../shaders/batch1/adire-indigo';
import { ankaraKaleido } from '../../../../shaders/batch1/ankara-kaleido';
import { lagosNightDrive } from '../../../../shaders/batch1/lagos-night-drive';
import { talkingDrumRings } from '../../../../shaders/batch1/talking-drum-rings';
import { goldDustHighlife } from '../../../../shaders/batch1/gold-dust-highlife';
import { shekereBeads } from '../../../../shaders/batch1/shekere-beads';
import { savannaSunsetPulse } from '../../../../shaders/batch1/savanna-sunset-pulse';
import { masqueradeSpirit } from '../../../../shaders/batch1/masquerade-spirit';
import { strobeLattice } from '../../../../shaders/batch2/strobe-lattice';
import { laserCathedral } from '../../../../shaders/batch2/laser-cathedral';
import { acidFold } from '../../../../shaders/batch2/acid-fold';
import { tranceHorizon } from '../../../../shaders/batch2/trance-horizon';
import { infiniteCorridor } from '../../../../shaders/batch2/infinite-corridor';
import { glitchGrid } from '../../../../shaders/batch2/glitch-grid';
import { warehouseFog } from '../../../../shaders/batch2/warehouse-fog';
import { hypnoSpiral } from '../../../../shaders/batch2/hypno-spiral';
import { bassFracture } from '../../../../shaders/batch2/bass-fracture';
import { euphoriaRays } from '../../../../shaders/batch2/euphoria-rays';
import ControlPanel, { type SliderKey } from '../../gallery/ControlPanel';
import DecisionLogPanel from '../../components/DecisionLogPanel';
import { Badge, Button, MeterBar, SliderRow } from '../../ui/controls';
import { font, ink, input, panel, sectionHead, signal, size, space, tabular } from '../../ui/theme';

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
];

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
  const [calStatus, setCalStatus] = useState<CalibrationState>('idle');
  const [visuals, setVisuals] = useState<EventImage[]>([]);
  const [visBusy, setVisBusy] = useState(false);
  const [visError, setVisError] = useState<string | null>(null);
  const [disabledTex, setDisabledTex] = useState<string[]>([]);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [segInterval, setSegIntervalState] = useState(2);
  const [segStrength, setSegStrengthState] = useState(1);
  const [segInfo, setSegInfo] = useState<{
    perfN: number;
    crowdN: number;
    coverage: number;
    motion: number;
    model: string;
    status: string;
  } | null>(null);
  const [audioState, setAudioState] = useState<AudioState>('missing');
  const [camStarting, setCamStarting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const themeRef = useRef(theme);
  themeRef.current = theme;
  const audioRef = useRef({ source: 'mock' as ShowSource, bpm: 126, t0: 0, fileName: null as string | null });
  const fluxHist = useRef<number[]>([]);
  const beatUntil = useRef(0);
  const seqRef = useRef(0);
  const postTimes = useRef<number[]>([]);
  const mapSeq = useRef(0);
  const calRef = useRef<CalibrationState>('idle');
  const visualsRef = useRef<EventImage[]>([]);
  const texRef = useRef<{ id: string | null; texMix: number }>({ id: null, texMix: DEFAULT_TEX_MIX });
  const visualSeq = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const captureRef = useRef<HTMLCanvasElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const segTimerRef = useRef<number | null>(null);
  const segBusyRef = useRef(false);
  const visionRef = useRef<VisionTickState | null>(null);
  const lastSegRef = useRef<SegPayload | null>(null);
  const camOnRef = useRef(false);
  const intervalRef = useRef(2);
  const strengthRef = useRef(1);
  const segTickN = useRef(0);
  const lastRafRef = useRef<number | null>(null);
  const driveRef = useRef<((now: number) => void) | null>(null);
  const tickNodeRef = useRef<AudioWorkletNode | null>(null);
  const tickReadyRef = useRef(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapRef = useRef<ShowSnapshot | null>(null);
  const featRef = useRef<AudioFeatures | null>(null);
  const blackoutRef = useRef(false);
  const audioStateRef = useRef<AudioState>('missing');
  const prevPubSegRef = useRef<SegPayload | null>(null);

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
      if (m.t === 'ready') {
        bus.post({ t: 'state', state: director.snapshot() });
        // M7: late-opening output gets the artwork + current pick too.
        if (visualsRef.current.length > 0) {
          bus.post({
            t: 'visuals',
            images: visualsRef.current.map((v) => ({ id: v.id, energyTag: v.energyTag, dataUrl: v.dataUrl })),
          });
          bus.post({ t: 'texture', id: texRef.current.id, texMix: texRef.current.texMix });
        }
        // M8: late-opening output gets the latest segmentation read too.
        if (lastSegRef.current !== null) bus.post({ t: 'seg', seg: lastSegRef.current });
      } else if (m.t === 'outStats') setOutStats({ fps: m.fps, ms: Math.round(m.msSincePacket) });
    };
    const hb = window.setInterval(() => {
      bus.post({ t: 'alive', now: Date.now() });
      const cutoff = performance.now() - 1000;
      postTimes.current = postTimes.current.filter((t) => t >= cutoff);
      setPktRate(postTimes.current.length);
      // M9-A: keep the status bar's audio state honest at 1 Hz.
      const ctx = sharedRef.current.ctx;
      const st: AudioState =
        ctx === null
          ? audioRef.current.source === 'mock'
            ? 'missing'
            : audioStateRef.current
          : ctx.state === 'running'
            ? 'running'
            : ctx.state === 'suspended'
              ? 'suspended'
              : 'closed';
      if (st !== audioStateRef.current) {
        audioStateRef.current = st;
        setAudioState(st);
      }
    }, HEARTBEAT_MS);
    // M9-A: any click wakes a suspended audio engine (autoplay policy).
    const wakeAudio = () => {
      const ctx = sharedRef.current.ctx;
      if (ctx && ctx.state === 'suspended') {
        void resumeAudioContext(ctx).then((st) => {
          if (st !== audioStateRef.current) {
            audioStateRef.current = st;
            setAudioState(st);
          }
        });
      }
    };
    window.addEventListener('pointerdown', wakeAudio);
    fetch(withBasePath('/api/mode'))
      .then((r) => r.json())
      .then((m) => setMode(m as { live: boolean; model: string }))
      .catch(() => setMode({ live: false, model: 'muse-spark-1.3' }));
    let raf = 0;
    let cancelled = false;
    // M9-A: one audio driver, fed by rAF in the foreground and by the
    // AudioWorklet standby tick while the tab is hidden — never both.
    const driveAudio = (now: number) => {
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
      featRef.current = f;
      snapRef.current = director.snapshot();
      const cal = analyzer.calibration;
      if (cal !== calRef.current) {
        calRef.current = cal;
        setCalStatus(cal);
      }
    };
    driveRef.current = driveAudio;
    const loop = () => {
      if (cancelled) return;
      const now = performance.now();
      lastRafRef.current = now;
      driveAudio(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // M7: artwork for the opening theme (cache hit after a reload).
    void runVisuals(themeRef.current);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearInterval(hb);
      window.removeEventListener('pointerdown', wakeAudio);
      tickNodeRef.current?.disconnect();
      if (segTimerRef.current !== null) window.clearInterval(segTimerRef.current);
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      bus.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // M9-A live preview: this window renders the same show it directs, so
  // one window is enough. Cuts on scene change (a monitor, not the show).
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas);
    } catch {
      setPreviewError('Preview needs WebGL.');
      return;
    }
    let cancelled = false;
    let raf = 0;
    const easer = new SegEaser();
    const env = new Envelope();
    const art = new Map<string, HTMLImageElement>();
    let artKey = '';
    let boundTex: string | null = null;
    let progId: string | null = null;
    let pulse = 0;
    let lastNow = performance.now();
    const loop = () => {
      if (cancelled) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      const snap = snapRef.current;
      const f0 = featRef.current;
      if (snap !== null && f0 !== null && !blackoutRef.current) {
        if (snap.visualId !== progId) {
          const def = DEFS.find((d) => d.id === snap.visualId) ?? DEFS[0];
          renderer.setShader(def);
          progId = snap.visualId;
        }
        const f = { ...f0, energy: env.step(rawEnergy(f0), dt * 1000) };
        pulse += ((f.beat ? 1 : 0) - pulse) * (f.beat ? 0.55 : 0.07);
        const setKey = visualsRef.current.map((v) => v.id).join(',');
        if (setKey !== artKey) {
          artKey = setKey;
          art.clear();
          boundTex = null;
          for (const v of visualsRef.current) {
            const img = new Image();
            img.src = v.dataUrl;
            const id = v.id;
            img
              .decode()
              .then(() => art.set(id, img))
              .catch(() => {});
          }
        }
        const texId = texRef.current.id;
        if (texId !== boundTex) {
          const img = texId === null ? null : (art.get(texId) ?? null);
          if (texId === null || img !== null) {
            renderer.setEventTexture(img);
            boundTex = texId;
          }
        }
        const last = lastSegRef.current;
        if (last !== null && last !== prevPubSegRef.current) {
          prevPubSegRef.current = last;
          const perf = decodeGrid(last.perf, last.w, last.h);
          const crowd = decodeGrid(last.crowd, last.w, last.h);
          if (perf !== null && crowd !== null) {
            easer.setTarget(
              { perf, crowd, w: last.w, h: last.h, box: last.box, motion: last.motion, strength: last.strength },
              now,
            );
          }
        }
        let seg: SegUniforms = NO_SEG;
        const ef = easer.frame(dt * 1000, now);
        if (ef !== null) {
          renderer.setSegMask(ef.rgba, ef.w, ef.h);
          seg = { mix: ef.mix, box: ef.box, motion: ef.motion };
        }
        renderer.renderVisual(
          now / 1000,
          f,
          rotate(snap.palette, snap.paletteEmphasis),
          snap.intensity,
          snap.speed,
          pulse,
          snap.extra,
          1,
          texRef.current.texMix,
          seg,
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => subscribeCredits(() => setCredits({ ...getCredits() })), []);

  useEffect(() => {
    if (!view) return;
    fluxHist.current = [...fluxHist.current, view.meters.flux].slice(-60);
    if (view.meters.beat) beatUntil.current = performance.now() + 180;
    texRef.current = { ...view.texture };
  }, [view]);

  // Audio element + mic refs live outside the mount effect for handlers.
  const sharedRef = useRef<{ ctx: AudioContext | null; el: HTMLAudioElement | null; mic: MediaStream | null }>({
    ctx: null,
    el: null,
    mic: null,
  });

  // M9-A: awaited resume with one retry, then arm the hidden-tab
  // standby tick. Reports the engine state for the status bar.
  const ensureCtx = async (): Promise<AudioContext> => {
    if (!sharedRef.current.ctx) sharedRef.current.ctx = new AudioContext();
    const ctx = sharedRef.current.ctx;
    const st = await resumeAudioContext(ctx);
    if (st !== audioStateRef.current) {
      audioStateRef.current = st;
      setAudioState(st);
    }
    void ensureStandbyTick(ctx);
    return ctx;
  };

  const ensureStandbyTick = async (ctx: AudioContext): Promise<void> => {
    if (tickReadyRef.current || tickNodeRef.current !== null) return;
    try {
      if (!ctx.audioWorklet) return;
      const url = URL.createObjectURL(new Blob([STANDBY_WORKLET_SRC], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(ctx, 'aei-tick', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      node.port.onmessage = () => {
        const now = performance.now();
        if (shouldDriveFromStandby(now, lastRafRef.current)) driveRef.current?.(now);
      };
      node.connect(ctx.destination);
      tickNodeRef.current = node;
      tickReadyRef.current = true;
    } catch {
      /* old browser: rAF-only behavior, foreground only */
    }
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
        // M6: raw music in — browser voice filters would eat kicks and transients.
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        sharedRef.current.mic = stream;
        analyzerRef.current?.attach(stream, await ensureCtx());
        analyzerRef.current?.startCalibration();
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

  // M7: generate (or restore cached) event artwork, ship it to the
  // projector, and hand the director the pick list. Stale completions
  // (theme changed mid-flight) are dropped via visualSeq.
  const runVisuals = async (t: EventTheme, force = false) => {
    const seq = ++visualSeq.current;
    setVisBusy(true);
    setVisError(null);
    try {
      const imgs = await generateEventVisuals(t, tagsForCount(DEFAULT_IMAGE_COUNT), { force });
      if (seq !== visualSeq.current) return;
      setVisuals(imgs);
      visualsRef.current = imgs;
      setDisabledTex([]);
      busRef.current?.post({
        t: 'visuals',
        images: imgs.map((v) => ({ id: v.id, energyTag: v.energyTag, dataUrl: v.dataUrl })),
      });
      directorRef.current?.setEventImages(
        imgs.map((v): TextureMeta => ({ id: v.id, energyTag: v.energyTag, enabled: true })),
      );
    } catch (err) {
      if (seq !== visualSeq.current) return;
      setVisError(err instanceof Error ? err.message : 'generation failed');
    } finally {
      if (seq === visualSeq.current) setVisBusy(false);
    }
  };

  const toggleVisual = (id: string) => {
    const next = disabledTex.includes(id) ? disabledTex.filter((x) => x !== id) : [...disabledTex, id];
    setDisabledTex(next);
    directorRef.current?.setEventImages(
      visualsRef.current.map((v): TextureMeta => ({ id: v.id, energyTag: v.energyTag, enabled: !next.includes(v.id) })),
    );
  };

  const stopSegTimer = () => {
    if (segTimerRef.current !== null) {
      window.clearInterval(segTimerRef.current);
      segTimerRef.current = null;
    }
  };

  // M8 overlay: performer magenta, crowd cyan, smoothed box in white.
  const drawOverlay = (result: SegResultData, sig: VisionSignals) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const w = result.performer.mask.w;
    const h = result.performer.mask.h;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const perf = decodeGrid(result.performer.mask.data, w, h);
    const crowd = decodeGrid(result.crowd.mask.data, w, h);
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const p = perf?.[i] === 1;
      const c = crowd?.[i] === 1;
      const o = i * 4;
      img.data[o] = p ? 255 : c ? 0 : 12;
      img.data[o + 1] = p ? 93 : c ? 200 : 12;
      img.data[o + 2] = p ? 143 : c ? 220 : 14;
      img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    if (sig.performerBox !== null) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        sig.performerBox.x0 * w,
        sig.performerBox.y0 * h,
        (sig.performerBox.x1 - sig.performerBox.x0) * w,
        (sig.performerBox.y1 - sig.performerBox.y0) * h,
      );
    }
  };

  // M8 camera tick: downscaled frame (max 640px JPEG, memory only, never
  // every frame) -> segment -> verify -> signals -> director + projector.
  // Failures keep the last good mask; the cap stops the ticks entirely.
  const segTick = async () => {
    if (segBusyRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth < 16) {
      if (camOnRef.current) {
        setSegInfo((prev) => (prev === null || prev.status === 'no-frames' ? prev : { ...prev, status: 'no-frames' }));
      }
      return;
    }
    segBusyRef.current = true;
    const n = ++segTickN.current;
    try {
      if (!captureRef.current) captureRef.current = document.createElement('canvas');
      const cap = captureRef.current;
      const scale = Math.min(1, 640 / video.videoWidth);
      const cw = Math.max(16, Math.round(video.videoWidth * scale));
      const ch = Math.max(16, Math.round(video.videoHeight * scale));
      cap.width = cw;
      cap.height = ch;
      cap.getContext('2d')?.drawImage(video, 0, 0, cw, ch);
      const dataUrl = cap.toDataURL('image/jpeg', 0.8);
      if (!visionRef.current) visionRef.current = new VisionTickState();
      const tick = await visionRef.current.tick(dataUrl, cw, ch);
      const sig = tick.signals;
      const payload: SegPayload = {
        w: tick.result.performer.mask.w,
        h: tick.result.performer.mask.h,
        perf: tick.result.performer.mask.data,
        crowd: tick.result.crowd.mask.data,
        box:
          sig.performerBox === null
            ? null
            : [
                sig.performerBox.x0,
                sig.performerBox.y0,
                sig.performerBox.x1 - sig.performerBox.x0,
                sig.performerBox.y1 - sig.performerBox.y0,
              ],
        present: sig.performerPresent,
        coverage: sig.crowdCoverage,
        motion: sig.crowdMotion,
        strength: strengthRef.current,
        at: Date.now(),
      };
      lastSegRef.current = payload;
      busRef.current?.post({ t: 'seg', seg: payload });
      directorRef.current?.setVision({
        present: sig.performerPresent,
        coverage: sig.crowdCoverage,
        motion: sig.crowdMotion,
        performerCount: sig.performerCount,
        crowdCount: sig.crowdCount,
      });
      setSegInfo({
        perfN: sig.performerCount,
        crowdN: sig.crowdCount,
        coverage: sig.crowdCoverage,
        motion: sig.crowdMotion,
        model: tick.model,
        status: 'live',
      });
      drawOverlay(tick.result, sig);
      logDecision({
        step: 'sam',
        model: tick.model,
        input: `tick #${n} (${intervalRef.current.toFixed(1)}s)`,
        result: `perf ${sig.performerCount} / crowd ${sig.crowdCount} · cov ${sig.crowdCoverage.toFixed(2)} · mot ${sig.crowdMotion.toFixed(2)} · PASS`,
        verify: { pass: true, reason: 'mask dims, boxes, counts valid' },
        retries: 0,
        latencyMs: tick.latencyMs,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const capped = msg.includes('blocked:');
      if (capped) stopSegTimer();
      logDecision({
        step: capped ? 'cap' : 'sam',
        model: 'local',
        input: `tick #${n}`,
        result: capped ? msg : `FAIL (${msg}) — keeping last mask`,
        verify: capped ? null : { pass: false, reason: msg },
        retries: 0,
        latencyMs: null,
      });
      setSegInfo((prev) => (prev === null ? prev : { ...prev, status: capped ? 'capped' : 'kept-last' }));
    } finally {
      segBusyRef.current = false;
    }
  };

  // M9-A: instant Starting feedback, the exact error in plain words,
  // and ON only when frames actually flow (no more silent black preview).
  const setCamera = async (on: boolean) => {
    if (on === camOnRef.current) return;
    setCamError(null);
    if (!on) {
      stopSegTimer();
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      camOnRef.current = false;
      setCamOn(false);
      visionRef.current?.reset();
      directorRef.current?.setVision(null);
      logDecision({
        step: 'manual',
        model: 'local',
        input: 'camera toggle',
        result: 'camera off',
        verify: null,
        retries: 0,
        latencyMs: null,
      });
      return;
    }
    setCamStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw { name: 'TypeError' };
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 } } });
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      camStreamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw { name: 'AbortError' };
      video.srcObject = stream;
      await video.play();
      const flowing = await waitForFrames(() => (videoRef.current?.readyState ?? 0) >= 2, 4000, 100);
      if (!flowing) throw { name: 'NoFrames' };
      camOnRef.current = true;
      setCamOn(true);
      stopSegTimer();
      segTimerRef.current = window.setInterval(() => void segTick(), intervalRef.current * 1000);
      logDecision({
        step: 'manual',
        model: 'local',
        input: 'camera toggle',
        result: 'camera on, frames flowing',
        verify: null,
        retries: 0,
        latencyMs: null,
      });
    } catch (err) {
      const name =
        err instanceof DOMException ? err.name : ((err as { name?: string } | null)?.name ?? undefined);
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCamError(cameraErrorMessage(name));
      logDecision({
        step: 'manual',
        model: 'local',
        input: 'camera toggle',
        result: `camera failed: ${name ?? 'unknown'}`,
        verify: null,
        retries: 0,
        latencyMs: null,
      });
    } finally {
      setCamStarting(false);
    }
  };

  const setSegInterval = (s: number) => {
    setSegIntervalState(s);
    intervalRef.current = s;
    if (camOnRef.current) {
      stopSegTimer();
      segTimerRef.current = window.setInterval(() => void segTick(), s * 1000);
    }
  };

  const setSegStrength = (v: number) => {
    setSegStrengthState(v);
    strengthRef.current = v;
    const last = lastSegRef.current;
    if (last !== null) {
      const next = { ...last, strength: v };
      lastSegRef.current = next;
      busRef.current?.post({ t: 'seg', seg: next });
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
      const ctx = await ensureCtx();
      analyzerRef.current?.attachElement(el, ctx, true);
      analyzerRef.current?.startCalibration();
      if (ctx.state !== 'running') setAudioError('Audio engine is suspended — click anywhere on this page to wake it.');
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
      void runVisuals(next);
    } catch (err) {
      setFlyerError(err instanceof Error ? err.message : 'verification failed');
    } finally {
      setFlyerBusy(false);
    }
  };

  // M9-A: projector window on demand (single-launch: control only).
  const openOutput = () => {
    window.open(withBasePath('/show/output'), '_blank', 'noopener,width=1280,height=720');
  };

  function rotate<T>(arr: T[], k: number): T[] {
    const n = arr.length;
    const s = ((k % n) + n) % n;
    return [...arr.slice(s), ...arr.slice(0, s)];
  }

  const live = view?.live ?? { intensity: 0.7, speed: 1, extra: [1, 0.28, 1] as [number, number, number] };
  const activeDef = DEFS.find((d) => d.id === view?.visualId) ?? DEFS[0];
  // Track clock for the map playhead; re-derived every render (10 Hz via view).
  const trackT = Math.max(0, (performance.now() - audioRef.current.t0) / 1000);
  const trackPct = trackMap === null ? 0 : Math.min(100, Math.max(0, (trackT / trackMap.durationS) * 100));
  // Mock is synthetic: always ready. Live sources calibrate for ~3s first.
  const calLabel = source === 'mock' || calStatus === 'ready' ? 'Ready' : calStatus === 'calibrating' ? 'Calibrating…' : '—';
  const calTone = calLabel === 'Ready' ? styles.mapReady : calLabel === 'Calibrating…' ? styles.mapBusy : styles.dim;
  const audioBadge = audioStateLabel(audioState);

  return (
    <main style={styles.page}>
      <header style={styles.statusbar}>
        <h1 style={styles.title}>PAPAGEDON AEI</h1>
        <Badge tone={mode?.live ? 'live' : 'muted'}>
          {mode === null ? '…' : mode.live ? `LIVE · ${mode.model}` : 'MOCK · no keys'}
        </Badge>
        <Badge tone={audioBadge.tone}>{audioBadge.text}</Badge>
        <span title="live audio level" style={styles.statusLevel}>
          <MeterBar label="level" value={view?.meters.energy ?? 0} color={signal.live} />
        </span>
        <span
          title="beat"
          style={{
            ...styles.beat,
            background: performance.now() < beatUntil.current ? signal.live : ink.raised,
          }}
        />
        <span style={styles.dim}>BPM {view?.meters.bpm ?? 0}</span>
        <Badge tone={camOn ? 'ok' : camError !== null ? 'warn' : 'muted'}>
          {camStarting ? 'Camera…' : camOn ? 'Camera on' : camError !== null ? 'Camera blocked' : 'Camera off'}
        </Badge>
        <span style={styles.dim}>
          {credits.calls}/{credits.callCap} calls{credits.capped ? ' · CAPPED' : ''}
        </span>
      </header>

      <div style={styles.grid3} className="aei-grid-3col">
        <div style={styles.col}>
          <div style={styles.zoneTitle}>Inputs</div>
          <section style={styles.card}>
            <h2 style={styles.cardHead}>Flyer</h2>
            <div style={styles.row}>
              <Button onClick={() => flyerInputRef.current?.click()} disabled={flyerBusy}>
                {flyerBusy ? 'Verifying…' : 'Load flyer'}
              </Button>
              <span style={styles.dim}>{theme.eventName}</span>
            </div>
            <div style={styles.row}>
              {theme.palette.map((c) => (
                <span key={c} title={c} style={{ ...styles.swatch, background: c }} />
              ))}
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
            <h2 style={styles.cardHead}>Audio source</h2>
            <div style={styles.row}>
              {(['mic', 'file', 'mock'] as const).map((s) => (
                <Button key={s} kind={s === source ? 'active' : 'default'} onClick={() => void pickSource(s)}>
                  {s === 'mock' ? `mock ${bpm}` : s}
                </Button>
              ))}
            </div>
            {fileName !== null && source === 'file' && <span style={styles.dim}>{fileName}</span>}
            <MeterBar label="level" value={view?.meters.energy ?? 0} color={signal.live} />
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
              <span>Room:</span>
              <span style={calTone}>{calLabel}</span>
              <Button onClick={() => analyzerRef.current?.startCalibration()} disabled={source === 'mock'}>
                Recalibrate
              </Button>
            </div>
            <div style={styles.row}>
              <span>Profile:</span>
              <span>
                {view?.profile
                  ? `${view.profile.label} · ${Math.round(view.profile.confidence * 100)}% · ${view.profile.bpm} bpm`
                  : 'listening…'}
              </span>
            </div>
            {(['subBass', 'bass', 'mid', 'high'] as const).map((k) => (
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
              <span>stream {pktRate} Hz</span>
            </div>
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
            <h2 style={styles.cardHead}>Camera</h2>
            <div style={styles.row}>
              <Button kind={camOn ? 'active' : 'default'} disabled={camStarting} onClick={() => void setCamera(!camOn)}>
                {camStarting ? 'Starting…' : camOn ? 'Camera on' : camError !== null ? 'Try again' : 'Camera off'}
              </Button>
              <span style={styles.dim}>
                {segInfo === null
                  ? 'camera sees the stage'
                  : `perf ${segInfo.perfN} · crowd ${segInfo.crowdN} · ${segInfo.model} · ${segInfo.status}`}
              </span>
            </div>
            {camError !== null && <span style={styles.error}>{camError}</span>}
            <video ref={videoRef} muted playsInline style={styles.camPreview} />
            <SliderRow
              label="tick"
              display={`${segInterval.toFixed(1)}s`}
              min={1}
              max={5}
              step={0.5}
              value={segInterval}
              onChange={(n) => setSegInterval(n)}
            />
            <SliderRow
              label="mask strength"
              display={segStrength.toFixed(2)}
              min={0}
              max={1}
              step={0.01}
              value={segStrength}
              onChange={(n) => setSegStrength(n)}
            />
            {segInfo !== null && (
              <div style={styles.row}>
                <canvas ref={overlayRef} style={styles.overlay} />
                <div style={styles.col}>
                  <span>coverage {(segInfo.coverage * 100).toFixed(0)}%</span>
                  <MeterBar label="motion" value={segInfo.motion} />
                </div>
              </div>
            )}
            <span style={styles.dim}>Frames are memory-only, never saved. Masks ease between ticks; stale masks fade after 10s.</span>
          </section>
        </div>

        <div style={styles.col}>
          <div style={styles.zoneTitle}>Show</div>
          <section style={styles.card}>
            <h2 style={styles.cardHead}>Live preview</h2>
            <div style={styles.previewWrap}>
              <canvas ref={previewCanvasRef} style={styles.previewCanvas} />
              {blackout && <div style={styles.previewBlack}>BLACKOUT</div>}
            </div>
            {previewError !== null && <span style={styles.error}>{previewError}</span>}
            <div style={styles.row}>
              <Button onClick={openOutput}>Open output window</Button>
              <Button
                kind={blackout ? 'danger' : 'default'}
                onClick={() => {
                  const next = !blackout;
                  blackoutRef.current = next;
                  setBlackout(next);
                  directorRef.current?.setBlackout(next);
                }}
              >
                {blackout ? 'RELEASE BLACKOUT' : 'Blackout'}
              </Button>
            </div>
            <div style={styles.row}>
              <span>out {outStats === null ? '—' : `${outStats.fps} fps · ${outStats.ms} ms old`}</span>
            </div>
            <span style={styles.dim}>Same picture as the projector — this window alone is enough.</span>
          </section>

          <section style={styles.card}>
            <Button onClick={() => setAdvancedOpen(!advancedOpen)}>
              {advancedOpen ? 'Hide advanced' : 'Show advanced'}
            </Button>
            {advancedOpen && (
              <div style={styles.col}>
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
              </div>
            )}
          </section>
        </div>

        <div style={styles.col} className="aei-col-director">
          <div style={styles.zoneTitle}>Director</div>
          <section style={styles.card}>
            <h2 style={styles.cardHead}>Now</h2>
            <div style={styles.sceneName}>{view?.sceneName ?? '—'}</div>
            <div style={styles.reason}>{view?.reason ?? 'Starting…'}</div>
            <div style={styles.statsCol}>
              <span>Arc: {view?.arc ?? '—'}</span>
              <span>Events: {view && view.events.length > 0 ? view.events.join(', ') : '—'}</span>
              <span>Next Muse call: {view?.plannerBusy ? 'calling…' : `${view?.countdownS ?? 0}s`}</span>
              {view !== null && view.manualHoldS > 0 && <span>Manual hold: {view.manualHoldS.toFixed(0)}s</span>}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardHead}>Timeline</h2>
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
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardHead}>Event visuals</h2>
            <div style={styles.row}>
              <Button onClick={() => void runVisuals(theme, true)} disabled={visBusy}>
                {visBusy ? 'Generating…' : 'Regenerate'}
              </Button>
              <span style={styles.dim}>
                {visuals.length === 0
                  ? 'no visuals yet'
                  : `${visuals.length} visuals · live texture ${view?.texture.id ?? '—'}`}
              </span>
            </div>
            {visError !== null && <span style={styles.error}>{visError}</span>}
            {visuals.length > 0 && (
              <div style={styles.thumbs}>
                {visuals.map((v) => {
                  const on = !disabledTex.includes(v.id);
                  const active = view?.texture.id === v.id;
                  return (
                    <label
                      key={v.id}
                      title={v.prompt}
                      style={{
                        ...styles.thumb,
                        ...(active ? styles.thumbActive : null),
                        ...(on ? null : styles.thumbOff),
                      }}
                    >
                      <img src={v.dataUrl} alt={`${v.energyTag} artwork`} style={styles.thumbImg} />
                      <span style={styles.thumbMeta}>
                        <input type="checkbox" checked={on} onChange={() => toggleVisual(v.id)} />
                        {v.energyTag} · {v.source}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <SliderRow
              label="texMix"
              display={(view?.texture.texMix ?? DEFAULT_TEX_MIX).toFixed(2)}
              min={0}
              max={1}
              step={0.01}
              value={view?.texture.texMix ?? DEFAULT_TEX_MIX}
              onChange={(n) => directorRef.current?.manualTexture({ texMix: n })}
            />
            <span style={styles.dim}>Texture follows the section energy; the slider overrides for 8s.</span>
          </section>

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
    maxWidth: 1720,
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
  thumbs: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 },
  thumb: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 6,
    background: '#0d0d0d',
    border: `1px solid ${ink.line}`,
    borderRadius: 6,
    cursor: 'pointer',
  },
  thumbActive: { borderColor: signal.live },
  thumbOff: { opacity: 0.45 },
  thumbImg: { width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 4 },
  thumbMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: size.small, color: ink.dim },
  camPreview: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: '4 / 3',
    background: '#0d0d0d',
    borderRadius: 6,
    border: `1px solid ${ink.line}`,
  },
  overlay: {
    width: 128,
    height: 96,
    background: '#0d0d0d',
    borderRadius: 6,
    border: `1px solid ${ink.line}`,
    imageRendering: 'pixelated',
  },
  statusbar: {
    ...panel,
    display: 'flex',
    alignItems: 'center',
    gap: space.lg,
    padding: '10px 16px',
    flexWrap: 'wrap',
  },
  statusLevel: { width: 150 },
  grid3: { display: 'grid', gridTemplateColumns: '300px minmax(0,1fr) 360px', gap: space.md, alignItems: 'start' },
  zoneTitle: { ...sectionHead, color: ink.dim },
  previewWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    background: '#0d0d0d',
    borderRadius: 6,
    overflow: 'hidden',
    border: `1px solid ${ink.line}`,
  },
  previewCanvas: { width: '100%', height: '100%', display: 'block' },
  previewBlack: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    color: ink.dim,
    fontSize: size.head,
    fontWeight: 800,
    letterSpacing: 2,
  },
  statsCol: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: size.body, ...tabular },
};
