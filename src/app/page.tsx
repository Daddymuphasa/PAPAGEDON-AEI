'use client';

// M1 visualizer page: mock theme + mock audio -> director -> example shader.
// End-to-end in MOCK mode with zero API calls.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AudioFeatures, EventTheme } from '../types';
import { LocalAudioAnalyzer, mockFeatures } from '../inputs/audio/localAnalyzer';
import { requestTheme } from '../inputs/flyer/flyer';
import { DirectorAgent } from '../director/director';
import { Renderer } from '../engine/renderer';
import { exampleBassPulse } from '../../shaders/example-bass-pulse';
import { mockTheme } from '../meta/mock';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [theme, setTheme] = useState<EventTheme>(mockTheme);
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
    try {
      setTheme(await requestTheme(await fileToDataUrl(file)));
    } catch {
      setTheme(mockTheme);
    }
  };

  if (!running) {
    return (
      <main style={styles.center}>
        <h1 style={styles.title}>PAPAGEDON AEI</h1>
        <p style={styles.sub}>Director Mode — M1 scaffold (mock)</p>
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
          Flyer (M2):{' '}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && onFlyer(e.target.files[0])}
          />
        </label>
      </div>
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
};
