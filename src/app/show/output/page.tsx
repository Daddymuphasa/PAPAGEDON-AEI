'use client';

// M4 output window: fullscreen projector visuals, no UI, no cursor.
// Renders from the control window's streamed feature packets (M4.2),
// falling back to a local mock signal when the stream stalls.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { font, ink, size } from '../../ui/theme';
import type { AudioFeatures } from '../../../types';
import { mockFeatures } from '../../../inputs/audio/localAnalyzer';
import { Envelope, rawEnergy } from '../../../inputs/audio/dsp';
import { NO_SEG, Renderer, type SegUniforms } from '../../../engine/renderer';
import { Crossfade } from '../../../engine/transition';
import { FpsMonitor } from '../../../engine/fps';
import { DEFAULT_VISUAL_PARAMS } from '../../../engine/visualParams';
import { BeatLatch, isFeatPacket, isStreamStale } from '../../../director/featureStream';
import { DEFAULT_TEX_MIX, TEX_BEAT_PUSH } from '../../../director/texturePick';
import { getShader, listShaders } from '../../../../shaders/registry';
import { LIB_TAG, M3_TAG, registerVisualizer } from '../../../../shaders/verifyVisualizer';
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
import { heavenlyLight } from '../../../../shaders/batch3/heavenly-light';
import { stainedGlassBloom } from '../../../../shaders/batch3/stained-glass-bloom';
import { risingDoves } from '../../../../shaders/batch3/rising-doves';
import { gloryClouds } from '../../../../shaders/batch3/glory-clouds';
import { candleField } from '../../../../shaders/batch3/candle-field';
import { rosePetalFall } from '../../../../shaders/batch3/rose-petal-fall';
import { goldRingHalo } from '../../../../shaders/batch3/gold-ring-halo';
import { silkRibbonDance } from '../../../../shaders/batch3/silk-ribbon-dance';
import { crystalChandelier } from '../../../../shaders/batch3/crystal-chandelier';
import { dawnBreaks } from '../../../../shaders/batch3/dawn-breaks';
import { ShowBus, type BusMessage, type FeatPacket } from '../../../director/showBus';
import { decodeGrid } from '../../../vision/signals';
import { SegEaser } from '../../../vision/segEase';

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
];

function rotate<T>(arr: T[], k: number): T[] {
  const n = arr.length;
  const s = ((k % n) + n) % n;
  return [...arr.slice(s), ...arr.slice(0, s)];
}

export default function ShowOutput() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Warming up…');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'WebGL unavailable');
      return;
    }
    const fpsMon = new FpsMonitor();
    const bus = new ShowBus();
    let cancelled = false;
    let raf = 0;
    const show = {
      visualId: DEFS[0].id,
      extra: [1, 0.28, 1] as [number, number, number],
      intensity: DEFAULT_VISUAL_PARAMS.intensity,
      speed: DEFAULT_VISUAL_PARAMS.speed,
      palette: [...DEFAULT_VISUAL_PARAMS.palette],
      emphasis: 0,
      sensitivity: 1,
      blackout: false,
      bpm: DEFAULT_VISUAL_PARAMS.bpm,
    };
    const latch = new BeatLatch();
    let latest: FeatPacket | null = null;
    let lastFeatAt: number | null = null;
    let blend = 1; // 0 = live stream, 1 = mock fallback
    let lastStats = 0;
    let currentProg: WebGLProgram | null = null;
    let toProg: WebGLProgram | null = null;
    let fade: Crossfade | null = null;
    let pulse = 0;
    let flash = 0;
    let boost = 0;
    let prevBeat = false;
    let lastNow = performance.now();
    const env = new Envelope();
    // M7 event-art layer: decoded visuals by id + the director's pick.
    const art = new Map<string, HTMLImageElement>();
    let texId: string | null = null;
    let texBase = DEFAULT_TEX_MIX;
    let boundTex: string | null = null;
    const texEnv = new Envelope();
    // M8 segmentation layer: one shared easer (also used by the control preview).
    const segEaser = new SegEaser();

    const applyScene = (
      visualId: string,
      transition: { type: string; durationMs: number },
    ) => {
      const def = getShader(visualId) ?? listShaders().find((d) => d.tags?.includes(M3_TAG) || d.tags?.includes(LIB_TAG));
      if (!def) return;
      if (transition.type === 'flash-cut') flash = Math.max(flash, 1);
      if (transition.type === 'cut' || transition.type === 'flash-cut') {
        renderer.setShader(def);
        const c = renderer.tryCompile(def);
        currentProg = 'prog' in c ? c.prog : currentProg;
        toProg = null;
        fade = null;
        return;
      }
      const c = renderer.tryCompile(def);
      if ('prog' in c && currentProg) {
        toProg = c.prog;
        fade = new Crossfade(Math.max(60, transition.durationMs));
        fade.begin(performance.now());
      } else if ('prog' in c) {
        currentProg = c.prog;
        renderer.setShader(def);
      }
    };

    bus.onMessage = (m: BusMessage) => {
      if (m.t === 'alive') return; // output plays on with or without control
      if (m.t === 'state' || m.t === 'scene') {
        const s = m.t === 'state' ? m.state : m;
        show.visualId = s.visualId;
        show.extra = [...s.extra] as [number, number, number];
        show.intensity = s.intensity;
        show.speed = s.speed;
        show.palette = [...s.palette];
        show.emphasis = s.paletteEmphasis;
        if (m.t === 'state') {
          show.sensitivity = m.state.sensitivity;
          show.blackout = m.state.blackout;
          show.bpm = m.state.bpm;
          const def = getShader(m.state.visualId);
          if (def) {
            renderer.setShader(def);
            const c = renderer.tryCompile(def);
            currentProg = 'prog' in c ? c.prog : currentProg;
          }
        } else {
          applyScene(m.visualId, m.transition);
        }
        return;
      }
      if (m.t === 'tweak') {
        show.intensity = m.intensity;
        show.speed = m.speed;
        show.extra = [...m.extra] as [number, number, number];
        show.emphasis = m.paletteEmphasis;
        show.sensitivity = m.sensitivity;
        return;
      }
      if (m.t === 'hit') {
        flash = Math.max(flash, m.flash);
        boost = Math.max(boost, m.boost);
        return;
      }
      if (m.t === 'blackout') {
        show.blackout = m.on;
        return;
      }
      if (m.t === 'audio') {
        show.bpm = m.bpm;
        return;
      }
      if (m.t === 'visuals') {
        art.clear();
        boundTex = null;
        for (const v of m.images) {
          const img = new Image();
          img.src = v.dataUrl;
          const id = v.id;
          img
            .decode()
            .then(() => art.set(id, img))
            .catch(() => {
              /* keep rendering the shader; a failed decode just never binds */
            });
        }
        return;
      }
      if (m.t === 'texture') {
        texId = m.id;
        texBase = Math.min(1, Math.max(0, m.texMix));
        return;
      }
      if (m.t === 'seg') {
        const s = m.seg;
        const perf = decodeGrid(s.perf, s.w, s.h);
        const crowd = decodeGrid(s.crowd, s.w, s.h);
        if (perf === null || crowd === null) return; // corrupt payload: hold the last mask
        segEaser.setTarget(
          {
            perf,
            crowd,
            w: s.w,
            h: s.h,
            box: s.box,
            motion: Math.min(1, Math.max(0, s.motion)),
            strength: Math.min(1, Math.max(0, s.strength)),
          },
          performance.now(),
        );
        return;
      }
      if (m.t === 'feat' && isFeatPacket(m)) {
        latest = m;
        lastFeatAt = performance.now();
        latch.push(m.seq, m.beat);
      }
    };
    bus.open();

    const loop = () => {
      if (cancelled) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      const stale = isStreamStale(lastFeatAt, now);
      blend = Math.min(1, Math.max(0, blend + (stale ? dt * 2 : -dt * 4)));
      // M9-A: the projector never fakes it silently — Mock beats stays up
      // whenever the live stream is gone, fullscreen included.
      if (tagRef.current) tagRef.current.style.display = blend > 0.5 ? 'block' : 'none';
      const latched = latch.take();
      const live: AudioFeatures | null =
        latest === null
          ? null
          : {
              bpm: latest.bpm,
              beat: latched,
              onset: latched,
              bass: latest.bass,
              subBass: latest.subBass,
              mid: latest.mid,
              high: latest.high,
              energy: latest.energy,
              flux: latest.flux,
              beatConfidence: latest.beatConfidence,
              buildUp: latest.buildUp,
              drop: latest.drop,
              timestamp: now,
            };
      const mock = mockFeatures(now / 1000, now, show.bpm);
      let f: AudioFeatures;
      if (blend >= 1 || live === null) {
        f = mock;
      } else if (blend <= 0) {
        f = live;
      } else {
        const mix = (a: number, b: number) => a + (b - a) * blend;
        f = {
          ...live,
          bass: mix(live.bass, mock.bass),
          subBass: mix(live.subBass, mock.subBass),
          mid: mix(live.mid, mock.mid),
          high: mix(live.high, mock.high),
          energy: mix(live.energy, mock.energy),
          flux: mix(live.flux, mock.flux),
          beat: blend < 0.5 ? live.beat : mock.beat,
          onset: blend < 0.5 ? live.beat : mock.beat,
        };
      }
      // M6: uniforms ride a fast-attack/slow-release envelope of the raw
      // bands instead of the analyzer's heavily smoothed energy.
      f = { ...f, energy: env.step(rawEnergy(f), dt * 1000) };
      // M7: the artwork blend rides its own M6 envelope off the beat —
      // every kick pushes the texture up briefly, then it settles back.
      const texPush = texEnv.step(f.beat ? 1 : 0, dt * 1000) * TEX_BEAT_PUSH;
      const texMix = Math.min(1, Math.max(0, texBase + texPush));
      if (texId !== boundTex) {
        const img = texId === null ? null : (art.get(texId) ?? null);
        if (texId === null || img !== null) {
          renderer.setEventTexture(img);
          boundTex = texId;
        }
      }
      // M8: eased mask upload (R=performer G=crowd) + seg uniforms.
      let seg: SegUniforms = NO_SEG;
      const segFrame = segEaser.frame(dt * 1000, now);
      if (segFrame !== null) {
        renderer.setSegMask(segFrame.rgba, segFrame.w, segFrame.h);
        seg = { mix: segFrame.mix, box: segFrame.box, motion: segFrame.motion };
      }
      pulse += ((f.beat ? 1 : 0) - pulse) * (f.beat ? 0.55 : 0.07);
      if (f.beat && !prevBeat) {
        flash = Math.max(flash, (0.2 + 0.4 * f.bass) * Math.min(1.5, show.sensitivity));
      }
      prevBeat = f.beat;
      flash *= Math.exp(-dt * 6);
      boost *= Math.exp(-dt * 4);
      if (flashRef.current) flashRef.current.style.opacity = String(Math.min(1, flash));
      if (blackRef.current) blackRef.current.style.opacity = show.blackout ? '1' : '0';
      const m = fpsMon.tick(now);
      if (now - lastStats > 1000) {
        lastStats = now;
        bus.post({
          t: 'outStats',
          fps: Math.round(m.fps),
          msSincePacket: lastFeatAt === null ? -1 : now - lastFeatAt,
        });
      }
      const pal = rotate(show.palette, show.emphasis);
      if (!show.blackout) {
        const tick = fade?.tick(now) ?? null;
        if (tick && currentProg && toProg) {
          renderer.renderCrossfade(
            now / 1000, f, pal, show.intensity + boost, show.speed, pulse,
            show.extra, m.scale, currentProg, toProg, tick.mix, texMix, seg,
          );
          if (tick.done) {
            const def = getShader(show.visualId);
            if (def) renderer.setShader(def);
            currentProg = toProg;
            toProg = null;
            fade = null;
          }
        } else {
          renderer.renderVisual(
            now / 1000, f, pal, show.intensity + boost, show.speed, pulse, show.extra, m.scale, texMix, seg,
          );
        }
      }
      raf = requestAnimationFrame(loop);
    };

    (async () => {
      for (let i = 0; i < DEFS.length; i++) {
        if (cancelled) return;
        setStatus(`Warming up ${DEFS[i].name} (${i + 1}/${DEFS.length})…`);
        await registerVisualizer(DEFS[i], renderer);
      }
      if (cancelled) return;
      const first = getShader(show.visualId) ?? DEFS[0];
      renderer.setShader(first);
      const c = renderer.tryCompile(first);
      currentProg = 'prog' in c ? c.prog : null;
      setStatus('');
      bus.post({ t: 'ready' });
      lastNow = performance.now();
      raf = requestAnimationFrame(loop);
    })();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') void document.documentElement.requestFullscreen().catch(() => {});
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      bus.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goFullscreen = () => {
    void document.documentElement.requestFullscreen().catch(() => {});
  };

  return (
    <main style={styles.full} onClick={goFullscreen}>
      <canvas ref={canvasRef} style={styles.canvas} />
      <div ref={flashRef} style={{ ...styles.overlay, background: '#fff', opacity: 0 }} />
      <div ref={blackRef} style={{ ...styles.overlay, background: '#000', opacity: 0 }} />
      {status !== '' && <div style={styles.status}>{status}</div>}
      <div ref={tagRef} style={{ ...styles.tag, display: 'none' }}>
        Mock beats
      </div>
      <button
        style={styles.fs}
        onClick={(e) => {
          e.stopPropagation();
          goFullscreen();
        }}
      >
        Fullscreen (F)
      </button>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  full: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: ink.bg,
    cursor: 'none',
  },
  canvas: { width: '100%', height: '100%', display: 'block' },
  overlay: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  status: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    color: ink.text,
    fontFamily: font.ui,
    fontSize: size.head,
    background: 'rgba(10,10,10,0.72)',
    border: `1px solid ${ink.line}`,
    padding: '10px 18px',
    borderRadius: 8,
    pointerEvents: 'none',
  },
  fs: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    opacity: 0.12,
    cursor: 'pointer',
    fontFamily: font.ui,
    fontSize: size.data,
    color: ink.text,
    background: 'transparent',
    border: 'none',
    padding: 4,
  },
  tag: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    fontFamily: font.ui,
    fontSize: size.small,
    color: ink.dim,
    background: 'rgba(10,10,10,0.6)',
    padding: '4px 10px',
    borderRadius: 6,
    pointerEvents: 'none',
  },
};
