'use client';

// M2 visualizer page: flyer -> verified theme -> director -> example shader.
// End-to-end in MOCK mode with zero API calls.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AudioFeatures, EventTheme } from '../types';
import { LocalAudioAnalyzer, mockFeatures } from '../inputs/audio/localAnalyzer';
import { downscaleImage } from '../inputs/flyer/flyer';
import { extractVerifiedTheme } from '../inputs/flyer/applyTheme';
import { DirectorAgent } from '../director/director';
import { logDecision } from '../director/decisionLog';
import { Renderer } from '../engine/renderer';
import { exampleBassPulse } from '../../shaders/example-bass-pulse';
import { mockTheme } from '../meta/mock';
import DecisionLogPanel from './components/DecisionLogPanel';

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [theme, setTheme] = useState<EventTheme>(mockTheme);
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<EventTheme | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(true);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    if (!running || !canvasRef.current) return;
    const renderer = new Renderer(canvasRef.current);
    renderer.setShader(exampleBassPulse);
    const audio = new LocalAudioAnalyzer(); // mic attach lands in M3
    const director = new DirectorAgent();
    let features: AudioFeatures = mockFeatures(0);
    director.start(() => ({ theme: themeRef.current, features, insight: null, crowd: null }));
    let raf = 0;
    const loop = () => {
      const t = performance.now() / 1000;
      features = audio.live ? audio.frame() : mockFeatures(t);
      renderer.render(t, features, director.plan);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      director.stop();
    };
  }, [running]);

  const onFlyer = async (file: File) => {
    setPending(null);
    setVerifyError(null);
    let dataUrl: string;
    try {
      dataUrl = await downscaleImage(file);
    } catch {
      setVerifyError('Could not read that image.');
      return;
    }
    setFlyerUrl(dataUrl);
    setVerifying(true);
    try {
      const res = await extractVerifiedTheme(dataUrl);
      if (res.ok && res.theme) {
        setPending(res.theme);
      } else {
        setVerifyError(res.errors[0] ?? 'verification failed');
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const applyPending = () => {
    if (!pending) return;
    setTheme(pending);
    setPending(null);
    logDecision({
      step: 'observe',
      model: 'local',
      input: 'apply button',
      result: `applied "${pending.eventName}" to visualizer`,
      verify: { pass: true, reason: 'verified before apply' },
      retries: 0,
      latencyMs: null,
    });
  };

  if (!running) {
    return (
      <main style={styles.center}>
        <h1 style={styles.title}>PAPAGEDON AEI</h1>
        <p style={styles.sub}>Director Mode — M2 flyer to theme (mock)</p>
        <button style={styles.button} onClick={() => setRunning(true)}>
          Start visualizer
        </button>
      </main>
    );
  }

  return (
    <main style={styles.full}>
      <canvas ref={canvasRef} style={styles.canvas} />
      <div style={styles.hud}>
        <strong>{theme.eventName}</strong>
        <span>
          {theme.genre} · {theme.mood}
        </span>
        <label>
          Flyer:{' '}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && onFlyer(e.target.files[0])}
          />
        </label>
        <button style={styles.mini} onClick={() => setShowLog((v) => !v)}>
          {showLog ? 'Hide log' : 'Show log'}
        </button>
      </div>
      {(flyerUrl || pending || verifying || verifyError) && (
        <div style={styles.preview}>
          {flyerUrl && <img src={flyerUrl} alt="Uploaded flyer" style={styles.flyer} />}
          <div style={styles.previewBody}>
            {verifying && <span>Extracting + verifying theme…</span>}
            {verifyError && !verifying && <span style={styles.error}>{verifyError}</span>}
            {pending && !verifying && (
              <>
                <strong>{pending.eventName}</strong>
                <span>
                  {pending.genre} · {pending.mood} · energy {pending.energy.toFixed(2)}
                </span>
                <span>
                  {pending.tempoBpm.min}–{pending.tempoBpm.max} BPM · cut every{' '}
                  {pending.sceneSwitchSeconds.min}–{pending.sceneSwitchSeconds.max}s
                </span>
                <div style={styles.swatches}>
                  {pending.palette.map((c) => (
                    <span key={c} title={c} style={{ ...styles.swatch, background: c }} />
                  ))}
                </div>
                <span>Shaders: {pending.suggestedShaderIds.join(', ')}</span>
                <button style={styles.button} onClick={applyPending}>
                  Apply to visualizer
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {showLog && <DecisionLogPanel />}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  center: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    background: '#0a0a0a',
    fontFamily: 'system-ui, sans-serif',
  },
  title: { fontSize: 40, margin: 0, letterSpacing: 2 },
  sub: { margin: 0, opacity: 0.7 },
  button: { padding: '10px 24px', fontSize: 16, cursor: 'pointer' },
  full: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' },
  canvas: { width: '100%', height: '100%', display: 'block' },
  hud: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    background: 'rgba(0,0,0,0.55)',
    padding: '8px 12px',
    borderRadius: 6,
    fontFamily: 'system-ui, sans-serif',
    fontSize: 14,
  },
  mini: { fontSize: 13, cursor: 'pointer' },
  preview: {
    position: 'absolute',
    left: 12,
    top: 12,
    display: 'flex',
    gap: 12,
    background: 'rgba(0,0,0,0.72)',
    border: '1px solid #333',
    padding: 12,
    borderRadius: 6,
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
    maxWidth: 420,
  },
  flyer: { width: 110, height: 'auto', borderRadius: 4 },
  previewBody: { display: 'flex', flexDirection: 'column', gap: 6 },
  error: { color: '#ff8095' },
  swatches: { display: 'flex', gap: 6 },
  swatch: { width: 26, height: 26, borderRadius: 4, border: '1px solid #555' },
};
