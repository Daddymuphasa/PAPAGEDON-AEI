"use client";

/**
 * The /app experience: PAPAGEDON's engine in the browser.
 *
 * Pipeline (same order as Runtime::Update in PAPAGEDON-CORE-):
 *   audio source (file / input / loopback)  -> lib/papagedon/audioSources.ts
 *   AudioAnalyzer -> ExperienceSignals       -> lib/papagedon/analyzer.ts
 *   ExperienceGraph -> event/state/mood      -> lib/papagedon/experienceGraph.ts
 *   Renderer with the engine's GLSL packs    -> lib/papagedon/renderer.ts
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { AudioAnalyzer, emptySignals, type ExperienceSignals } from "@/lib/papagedon/analyzer";
import { AutoSensitivity, type SensitivityMode } from "@/inputs/audio/autoSensitivity";
import { ExperienceGraph, type ExperienceGraphOutput } from "@/lib/papagedon/experienceGraph";
import { AudioEngine, type AudioSourceKind, type InputDevice } from "@/lib/papagedon/audioSources";
import { PapagedonRenderer } from "@/lib/papagedon/renderer";
import { ASSET_BASE, catalog, type PackDef, type ThemeDef } from "@/lib/papagedon/catalog";
import { withBasePath } from "@/basePath";
import DirectorPanel, { type PanelImage } from "@/components/director/DirectorPanel";
import Drawer from "@/components/Drawer";
import FlyerPanel from "@/components/director/FlyerPanel";
import { CATALOG } from "../../../shaders/catalog";
import { ShowDirector, type DirectorEvent, type DirectorView } from "@/director/showDirector";
import { ENGINE_DEFS, ENGINE_PARAMS } from "@/director/engineDefs";
import { applyLiveToEngine, engineSignalsToFeatures, punchBeatBoost, resolveStageTransition, rolesToThemeDef } from "@/director/engineBridge";
import { logDecision } from "@/director/decisionLog";
import { extractVerifiedTheme } from "@/inputs/flyer/applyTheme";
import { FlyerError, downscaleImage } from "@/inputs/flyer/flyer";
import { coerceRoles } from "@/theme/roles";
import { generateEventVisuals } from "@/visuals/generate";
import { ENERGY_TAGS } from "@/visuals/prompts";
import { generateEngineShader } from "@/visuals/shaderGen";
import { VisionTickState } from "@/vision/client";
import { shouldSampleCrowd } from "@/inputs/crowd/crowdSignal";
import { verifyTrackMap } from "@/director/trackMap";
import type { EventTheme, TrackMap } from "@/types";
import { ORIGINALS, ORIGINALS_PACK, ORIGINAL_DEFS, originalEntry, originalIdFromFile } from "@/vision3d/originals";
import { adaptImmersiveSignals, adaptSignals, createBeatHold } from "@/vision3d/adapter";
import { createNanoHexVisualizer, type NanoHexVisualizer } from "@/vision3d/hex/nanoHex";
import { createImmersiveVisualizer, type ImmersiveId, type ImmersiveViz } from "@/vision3d/immersive/immersive";

const DEMO_CYCLE_SECONDS = 20; // PAPAGEDON_DEMO_CYCLE in Runtime.cpp

const themeById = (id: string | null | undefined): ThemeDef | undefined => catalog.themes.find((t) => t.id === id);
const defaultPack = catalog.packs.find((p) => p.id === "SignaturePack") ?? catalog.packs[0];
// GLSL packs plus the three.js originals (kept out of catalog.json/CATALOG,
// which stay 1:1 with the 74 on-disk shaders per catalog.test.ts).
const ALL_PACKS: PackDef[] = [...catalog.packs, ORIGINALS_PACK];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function locateVisual(visualId: string): { pack: PackDef; index: number } | null {
  for (const p of ALL_PACKS) {
    const index = p.shaders.findIndex((s) => s.id === visualId);
    if (index >= 0) return { pack: p, index };
  }
  return null;
}

function inputPlainError(e: unknown): string {
  const name = e instanceof Error ? e.name : "";
  if (!window.isSecureContext) {
    return "Microphone needs the secure address — open the https version of this page.";
  }
  if (name === "NotAllowedError") {
    return "Microphone permission was blocked — click the lock icon in the address bar, set Microphone to Allow, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No microphone was found.";
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return "That input is busy in another app or tab — close it there, then try again.";
  }
  return `Could not open the input: ${String(e)}`;
}

function flyerPlainError(err: unknown): string {
  if (err instanceof FlyerError) {
    switch (err.code) {
      case "server-key-missing":
        return "The server has no Meta key set — the host needs to add one.";
      case "key-rejected":
        return "The Meta key was rejected — it may be wrong or expired.";
      case "meta-timeout":
        return "Meta took too long to answer — try again.";
      default:
        return "Meta is having trouble right now — try again.";
    }
  }
  return err instanceof Error ? err.message : String(err);
}

type Hud = { s: ExperienceSignals; g: ExperienceGraphOutput };
type CameraScene = { label: string; detail: string; confidence: number };

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

export default function PapagedonApp() {
  return <PapagedonStage />;
}

function PapagedonStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const previousCameraFrameRef = useRef<Uint8Array | null>(null);
  const cameraMetricsRef = useRef({ brightness: 0.5, saturation: 0, warm: 0, motion: 0 });
  const rendererRef = useRef<PapagedonRenderer | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const analyzerRef = useRef(new AudioAnalyzer());
  const sensitivityRef = useRef(new AutoSensitivity());
  const sensModeRef = useRef<SensitivityMode>("auto");
  const graphRef = useRef(new ExperienceGraph());
  const shaderCache = useRef(new Map<string, string>());
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const rendererBRef = useRef<PapagedonRenderer | null>(null);
  const frontIsARef = useRef(true);
  const xfadeRef = useRef<{ t0: number; ms: number } | null>(null);
  const transitionRef = useRef({ type: "crossfade", durationMs: 600 });
  const boostCancelRef = useRef<(() => void) | null>(null);
  const directorRef = useRef<ShowDirector | null>(null);
  const directorAutoRef = useRef(true);
  const liveRef = useRef({ intensity: 0.7, speed: 1, extra: [0.15, 0.85, 1] as [number, number, number] });
  const prevSignalsRef = useRef<{ energy: number; beat: boolean } | null>(null);
  const themeRef = useRef<EventTheme | null>(null);
  const visionRef = useRef(new VisionTickState());
  const lastSamRef = useRef(0);
  const generatedRef = useRef(new Map<string, string>());
  const canvas3DRef = useRef<HTMLCanvasElement>(null);
  const viz3DRef = useRef<NanoHexVisualizer | null>(null);
  const viz3DVariantRef = useRef<string | null>(null);
  const viz3DErrorRef = useRef<string | null>(null);
  const beatHoldRef = useRef(createBeatHold());
  const canvas4DRef = useRef<HTMLCanvasElement>(null);
  const viz4DRef = useRef<ImmersiveViz | null>(null);
  const viz4DVariantRef = useRef<string | null>(null);
  const viz4DErrorRef = useRef<string | null>(null);
  const beat4DRef = useRef(createBeatHold());
  const packRef = useRef<PackDef>(defaultPack);
  const shaderIndexRef = useRef(0);
  const generatedIdRef = useRef<string | null>(null);

  const [glError, setGlError] = useState<string | null>(null);
  const [pack, setPack] = useState<PackDef>(defaultPack);
  const [shaderIndex, setShaderIndex] = useState(0);
  const [quality, setQuality] = useState(1);
  const [themeId, setThemeId] = useState<string>(defaultPack.recommendedTheme ?? "aurora");
  const [shaderError, setShaderError] = useState<string | null>(null);
  const [autoCycle, setAutoCycle] = useState(false);
  const [hideUi, setHideUi] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [source, setSource] = useState<AudioSourceKind | null>(null);
  const [sensMode, setSensMode] = useState<SensitivityMode>("auto");
  const [sensStatus, setSensStatus] = useState<"learning" | "locked">("learning");
  const [sourceLabel, setSourceLabel] = useState("No audio yet");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraScene, setCameraScene] = useState<CameraScene | null>(null);
  const [cameraDirector, setCameraDirector] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [devices, setDevices] = useState<InputDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [hud, setHud] = useState<Hud>({ s: emptySignals(), g: { event: "Silence", state: "Silence", mood: 0 } });
  const [beatFlash, setBeatFlash] = useState(0);
  const [directorAuto, setDirectorAuto] = useState(true);
  const [directorView, setDirectorView] = useState<DirectorView | null>(null);
  const [mode, setMode] = useState<{ live: boolean; model: string } | null>(null);
  const [eventTheme, setEventTheme] = useState<EventTheme | null>(null);
  const [flyerTheme, setFlyerTheme] = useState<ThemeDef | null>(null);
  const [flyerBusy, setFlyerBusy] = useState(false);
  const [flyerError, setFlyerError] = useState<string | null>(null);
  const [flyerNotice, setFlyerNotice] = useState<string | null>(null);
  const [images, setImages] = useState<PanelImage[]>([]);
  const [visualsBusy, setVisualsBusy] = useState(false);
  const [visualsStatus, setVisualsStatus] = useState<string | null>(null);
  const [texMixUI, setTexMixUI] = useState(0.4);
  const [textureLayer, setTextureLayer] = useState<{ id: string; mix: number } | null>(null);
  const [shaderBusy, setShaderBusy] = useState(false);
  const [shaderStatus, setShaderStatus] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [samStatus, setSamStatus] = useState("crowd camera off");
  const [diag, setDiag] = useState<{ running: boolean; checked: number; total: number; failures: string[] } | null>(null);
  const [diag3d, setDiag3d] = useState<{ running: boolean; checked: number; total: number; failures: string[] } | null>(null);
  const [blackout, setBlackout] = useState(false);

  const shader = pack.shaders[Math.min(shaderIndex, pack.shaders.length - 1)];
  const theme = useMemo(() => flyerTheme ?? themeById(themeId) ?? catalog.themes[0], [flyerTheme, themeId]);

  // Render-loop mirrors (the loop and the director callback read refs).
  sensModeRef.current = sensMode;
  packRef.current = pack;
  shaderIndexRef.current = shaderIndex;
  generatedIdRef.current = generatedId;
  themeRef.current = eventTheme;

  // ── WebGL2 dual canvas + render loop (front shows, back crossfades in) ──
  useEffect(() => {
    const canvasA = canvasRef.current;
    const canvasB = canvasBRef.current;
    if (!canvasA || !canvasB) return;
    let ra: PapagedonRenderer | null = null;
    let rb: PapagedonRenderer | null = null;
    try {
      ra = PapagedonRenderer.create(canvasA);
      rb = PapagedonRenderer.create(canvasB);
    } catch (e) {
      setGlError(e instanceof Error ? e.message : "WebGL2 failed to start");
    }
    if (!ra || !rb) {
      setGlError((m) => m ?? "This browser does not support WebGL2, which PAPAGEDON needs.");
      return;
    }
    rendererRef.current = ra;
    rendererBRef.current = rb;
    canvasB.style.opacity = "0";
    let raf = 0;
    let last = performance.now();
    let lastHud = 0;
    let beats = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const frame = audioRef.current?.readFrame() ?? null;
      const raw = frame ? analyzerRef.current.update(frame) : emptySignals();
      // Auto sensitivity learns the room's noise floor and gates it out, so
      // the stage, HUD and director all read settled signals — never raw noise.
      const signals = frame ? sensitivityRef.current.update(raw, sensModeRef.current) : raw;
      const graph = graphRef.current.update(signals);
      if (signals.beat) beats++;
      const d = directorRef.current;
      if (d && directorAutoRef.current) {
        const f = engineSignalsToFeatures(signals, graph, prevSignalsRef.current, now);
        prevSignalsRef.current = { energy: signals.energy, beat: signals.beat };
        d.frame(f, now);
      } else {
        prevSignalsRef.current = { energy: signals.energy, beat: signals.beat };
      }
      // The visual layer renders the same live engine signals the HUD meters
      // read — no attenuation — so the stage reacts exactly like live /app.
      const selPack = packRef.current;
      const selShader = selPack.shaders[Math.min(shaderIndexRef.current, selPack.shaders.length - 1)];
      const originalId = selShader ? originalIdFromFile(selShader.file) : null;
      const canvas3D = canvas3DRef.current;
      const canvas4D = canvas4DRef.current;
      const entry = originalId ? originalEntry(originalId) : undefined;
      if (originalId && entry?.kind === "immersive" && canvas4D) {
        driveImmersive(originalId, signals, canvas4D, canvasA, canvasB, canvas3D);
      } else if (originalId && canvas3D) {
        if (canvas4D) canvas4D.style.opacity = "0";
        driveOriginals(originalId, signals, canvas3D, canvasA, canvasB);
      } else {
        if (canvas3D) canvas3D.style.opacity = "0";
        if (canvas4D) canvas4D.style.opacity = "0";
        const front = frontIsARef.current ? ra! : rb!;
        const back = frontIsARef.current ? rb! : ra!;
        front.render(signals, graph, dt);
        const xf = xfadeRef.current;
        if (xf) {
          const k = Math.min(1, (now - xf.t0) / xf.ms);
          back.render(signals, graph, dt);
          const backCanvas = frontIsARef.current ? canvasB : canvasA;
          backCanvas.style.opacity = String(k);
          if (k >= 1) {
            frontIsARef.current = !frontIsARef.current;
            const oldFront = frontIsARef.current ? canvasB : canvasA;
            oldFront.style.opacity = "0";
            backCanvas.style.opacity = "1";
            xfadeRef.current = null;
          }
        }
      }
      if (now - lastHud > 100) {
        lastHud = now;
        const st = sensitivityRef.current.status();
        setSensStatus((prev) => (prev === st ? prev : st));
        setHud({ s: signals, g: graph });
        if (beats) setBeatFlash((b) => b + beats);
        beats = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ra?.dispose();
      rb?.dispose();
      rendererRef.current = null;
      rendererBRef.current = null;
      viz3DRef.current?.dispose();
      viz3DRef.current = null;
      viz3DVariantRef.current = null;
      viz4DRef.current?.dispose();
      viz4DRef.current = null;
      viz4DVariantRef.current = null;
    };
  }, []);

  // ── Shader compile (manual and director picks flow through here) ──
  useEffect(() => {
    if (generatedId) return; // a generated shader owns the stage
    const r = rendererRef.current;
    if (!r || !shader) return;
    if (originalIdFromFile(shader.file)) return; // three.js originals render in the loop
    let cancelled = false;
    (async () => {
      let src = shaderCache.current.get(shader.file);
      if (!src) {
        const res = await fetch(withBasePath(ASSET_BASE + shader.file));
        src = await res.text();
        shaderCache.current.set(shader.file, src);
      }
      if (cancelled) return;
      compileToBack(shader.name, src, transitionRef.current);
    })().catch((e) => setShaderError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [shader, generatedId, glError]);

  // ── Generated shader compile ──
  useEffect(() => {
    if (!generatedId) return;
    const src = generatedRef.current.get(generatedId);
    if (!src) return;
    compileToBack("Spark visual", src, { type: "crossfade", durationMs: 1500 });
  }, [generatedId]);

  useEffect(() => {
    const t = pack.id === "TranceExperiencePack";
    if (rendererRef.current) rendererRef.current.tranceMode = t;
    if (rendererBRef.current) rendererBRef.current.tranceMode = t;
  }, [pack]);

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.detail = quality;
    if (rendererBRef.current) rendererBRef.current.detail = quality;
  }, [quality]);

  const firstTheme = useRef(true);
  useEffect(() => {
    if (!theme) return;
    for (const r of [rendererRef.current, rendererBRef.current]) {
      if (r) r.setTheme(theme, firstTheme.current);
    }
    firstTheme.current = false;
  }, [theme, glError]);

  const choosePack = (id: string) => {
    const p = ALL_PACKS.find((x) => x.id === id);
    if (!p) return;
    setPack(p);
    setShaderIndex(0);
    setGeneratedId(null);
    if (p.recommendedTheme && themeById(p.recommendedTheme)) setThemeId(p.recommendedTheme);
    const first = p.shaders[0];
    if (first) directorRef.current?.manual({ visualId: first.id });
  };
  const step = useCallback(
    (d: number) => {
      const next = (shaderIndexRef.current + d + pack.shaders.length) % pack.shaders.length;
      setShaderIndex(next);
      setGeneratedId(null);
      const sh = pack.shaders[next];
      if (sh) directorRef.current?.manual({ visualId: sh.id });
    },
    [pack],
  );

  useEffect(() => {
    if (!autoCycle) return;
    const t = setInterval(() => step(1), DEMO_CYCLE_SECONDS * 1000);
    return () => clearInterval(t);
  }, [autoCycle, step]);

  // ── Audio sources ───────────────────────────────────────────────────────────
  const engine = () => (audioRef.current ??= new AudioEngine());
  const afterSwitch = () => {
    const a = audioRef.current!;
    analyzerRef.current.reset();
    sensitivityRef.current.reset();
    setSource(a.kind);
    setSourceLabel(a.label);
    setPlaying(a.playing);
    setSourceError(null);
    directorRef.current?.setAudio(
      a.kind === "file" ? "file" : a.kind === null ? "mock" : "mic",
      126,
      performance.now(),
      a.file?.name ?? null,
    );
  };
  const loadFile = async (file: File) => {
    try {
      await engine().loadFile(file);
      afterSwitch();
      void analyzeTrack(file);
    } catch {
      setSourceError(`Could not decode ${file.name}. Try an MP3, WAV, M4A or OGG.`);
    }
  };

  const analyzeTrack = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const res = await fetch(withBasePath("/api/track/analyze"), { method: "POST", body: buf });
      const data = (await res.json()) as { ok: boolean; map?: unknown };
      if (!data.ok || !data.map) {
        directorRef.current?.setTrackMap(null);
        return;
      }
      const check = verifyTrackMap(data.map);
      if (!check.ok) {
        directorRef.current?.setTrackMap(null);
        logDecision({
          step: "map",
          model: "local",
          input: `track map for ${file.name}`,
          result: `invalid: ${check.errors[0] ?? "unknown"}`,
          verify: { pass: false, reason: check.errors[0] ?? "invalid map" },
          retries: 0,
          latencyMs: null,
        });
        return;
      }
      const map = data.map as TrackMap;
      directorRef.current?.setTrackMap(map);
      logDecision({
        step: "map",
        model: "local",
        input: `track map for ${file.name}`,
        result: `${map.sections.length} sections verified, drops pre-cued`,
        verify: { pass: true, reason: "verified" },
        retries: 0,
        latencyMs: null,
      });
    } catch {
      directorRef.current?.setTrackMap(null);
    }
  };
  const startInput = async (id?: string) => {
    try {
      await engine().useInput(id || undefined);
      afterSwitch();
      const list = await AudioEngine.listInputs();
      setDevices(list);
      if (!id && list[0]) setDeviceId(list[0].deviceId);
    } catch (e) {
      setSourceError(inputPlainError(e));
    }
  };
  const startLoopback = async () => {
    try {
      await engine().useLoopback();
      afterSwitch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSourceError(
        !window.isSecureContext && msg.includes("not supported")
          ? "System audio needs the secure address — open the https version of this page."
          : msg,
      );
    }
  };
  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || a.kind !== "file") return;
    a.togglePlayPause();
    setPlaying(a.playing);
  };

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    previousCameraFrameRef.current = null;
    cameraMetricsRef.current = { brightness: 0.5, saturation: 0, warm: 0, motion: 0 };
    setCameraOn(false);
    setCameraScene(null);
    visionRef.current.reset();
    directorRef.current?.setVision(null);
  }, []);

  useEffect(() => {
    if (!cameraOn) return;
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = 160;
    canvas.height = 90;
    const sample = () => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const frame = new Uint8Array(canvas.width * canvas.height);
      let brightness = 0;
      let saturation = 0;
      let warm = 0;
      let motion = 0;
      for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
        const r = pixels[i] / 255;
        const g = pixels[i + 1] / 255;
        const b = pixels[i + 2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        brightness += luma;
        saturation += max === 0 ? 0 : (max - min) / max;
        warm += r - b;
        frame[p] = Math.round(luma * 255);
      }
      const count = frame.length;
      brightness /= count;
      saturation /= count;
      warm /= count;
      const previous = previousCameraFrameRef.current;
      if (previous) for (let i = 0; i < frame.length; i++) motion += Math.abs(frame[i] - previous[i]) / 255;
      motion /= count;
      previousCameraFrameRef.current = frame;
      const metrics = cameraMetricsRef.current;
      metrics.brightness = metrics.brightness * 0.78 + brightness * 0.22;
      metrics.saturation = metrics.saturation * 0.78 + saturation * 0.22;
      metrics.warm = metrics.warm * 0.78 + warm * 0.22;
      metrics.motion = metrics.motion * 0.78 + motion * 0.22;
      const smoothDark = metrics.brightness < 0.22;
      const smoothBright = metrics.brightness > 0.72;
      const smoothWarm = metrics.warm > 0.08;
      const smoothCool = metrics.warm < -0.08;
      const smoothMoving = metrics.motion > 0.075;
      const label = smoothDark ? "Low light" : smoothMoving ? "Motion scene" : smoothWarm ? "Warm scene" : smoothCool ? "Cool scene" : smoothBright ? "Bright scene" : "Balanced scene";
      const detail = `${Math.round(metrics.brightness * 100)}% light · ${Math.round(metrics.saturation * 100)}% colour · ${smoothMoving ? "movement detected" : "steady frame"}`;
      const confidence = Math.min(0.99, Math.max(0.45, 0.55 + Math.abs(metrics.brightness - 0.5) * 0.7 + (smoothMoving ? 0.12 : 0)));
      setCameraScene({ label, detail, confidence });
    };
    sample();
    const timer = window.setInterval(sample, 350);
    return () => window.clearInterval(timer);
  }, [cameraOn]);

  useEffect(() => {
    if (!cameraDirector || !cameraScene) return;
    const themeForScene: Record<string, string> = {
      "Low light": "dark-techno",
      "Motion scene": "neon-rave",
      "Warm scene": "badman",
      "Cool scene": "nebula",
      "Bright scene": "aurora",
      "Balanced scene": "industrial",
    };
    const next = themeForScene[cameraScene.label];
    if (next && themeById(next)) setThemeId(next);
  }, [cameraDirector, cameraScene]);

  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      stopCamera();
      return;
    }
    setCameraError(null);
    // Browsers hide the camera API on insecure (plain http) pages — say so.
    if (!window.isSecureContext) {
      setCameraError("Camera needs the secure address — open the https version of this page.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported in this browser.");
      return;
    }
    const openStream = () =>
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    try {
      let stream: MediaStream;
      try {
        stream = await openStream();
      } catch (e) {
        // Some devices reject the ideal constraints — retry with no asks.
        if (e instanceof DOMException && e.name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw e;
        }
      }
      cameraStreamRef.current = stream;
      const video = cameraVideoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        setCameraError("Camera preview could not be initialized.");
        return;
      }
      video.srcObject = stream;
      await video.play();
      setCameraOn(true);
      const track = stream.getVideoTracks()[0];
      track?.addEventListener("ended", () => {
        if (cameraStreamRef.current === stream) stopCamera();
      });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError") {
        // Stored denial is the common case: tell the user exactly how to undo it.
        let hint = "Camera permission was blocked.";
        try {
          const perm = await navigator.permissions?.query({ name: "camera" as PermissionName });
          if (perm?.state === "denied") {
            hint = "Camera is blocked for this site — click the lock icon in the address bar, set Camera to Allow, then press Try again.";
          } else if (perm?.state === "prompt") {
            hint = "Please choose Allow in the browser's camera popup, then press Try again.";
          }
        } catch {
          // Permissions API missing — keep the generic hint.
        }
        setCameraError(hint);
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCameraError("No camera was found on this device.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        setCameraError("The camera is busy in another app or tab — close it there, then press Try again.");
      } else {
        setCameraError("Could not start the camera.");
      }
      setCameraOn(false);
    }
  }, [cameraOn, stopCamera]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    void audioRef.current?.close();
  }, []);

  // ── Keyboard (mirrors the native player where browsers allow) ──────────────
  // ── Director lifecycle (rebuilt when a generated visual joins the catalog) ──
  useEffect(() => {
    const generated = [...generatedRef.current.keys()].map((id, i) => ({
      id,
      name: `Spark visual ${i + 1}`,
      tags: ["generated"],
      params: ENGINE_PARAMS.map((p) => ({ ...p })),
      meta: {
        themeTags: ["generated"],
        energyRange: [0.2, 0.9] as [number, number],
        moods: ["fresh"],
      },
    }));
    const d = new ShowDirector({
      defs: [...ENGINE_DEFS, ...ORIGINAL_DEFS, ...generated],
      getTheme: () => themeRef.current,
      onScene: handleSceneEvent,
      onUpdate: (v) => setDirectorView(v),
    });
    directorRef.current = d;
    return () => {
      directorRef.current = null;
    };
  }, [generatedCount]);

  // ── Mock/live mode badge ──
  useEffect(() => {
    fetch(withBasePath("/api/mode"))
      .then((r) => r.json())
      .then((m) => setMode({ live: !!m.live, model: String(m.model ?? "?") }))
      .catch(() => setMode({ live: false, model: "unreachable" }));
  }, []);

  // ── SAM crowd sampling on the camera tick ──
  useEffect(() => {
    if (!cameraOn) {
      setSamStatus("crowd camera off");
      return;
    }
    let cancelled = false;
    const id = window.setInterval(async () => {
      const canvas = cameraCanvasRef.current;
      if (!canvas || !shouldSampleCrowd(lastSamRef.current)) return;
      lastSamRef.current = Date.now();
      let frame: string;
      try {
        frame = canvas.toDataURL("image/jpeg", 0.6);
      } catch {
        return;
      }
      try {
        const tick = await visionRef.current.tick(frame, canvas.width, canvas.height);
        if (cancelled) return;
        directorRef.current?.setVision({
          present: tick.signals.performerPresent,
          coverage: tick.signals.crowdCoverage,
          motion: tick.signals.crowdMotion,
          performerCount: tick.signals.performerCount,
          crowdCount: tick.signals.crowdCount,
        });
        setSamStatus(
          tick.signals.performerPresent
            ? `Crowd camera: performer spotted · crowd ${Math.round(tick.signals.crowdCoverage * 100)}%`
            : `Crowd camera: watching · crowd ${Math.round(tick.signals.crowdCoverage * 100)}%`,
        );
      } catch (e) {
        if (!cancelled) setSamStatus(`Crowd camera unavailable (${e instanceof Error ? e.message : String(e)})`);
      }
    }, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [cameraOn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,select,textarea")) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "[") step(-1);
      else if (e.key === "]") step(1);
      else if (e.key === "h" || e.key === "H") setHideUi((h) => !h);
      else if (e.key === "a" || e.key === "A") setAutoCycle((v) => !v);
      else if (/^[1-9]$/.test(e.key)) {
        const t = catalog.themes[Number(e.key) - 1];
        if (t) pickTheme(t.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // ── Director stage helpers ──
  // Lazily owns the nano-hex visualizer: creates it on first need, switches
  // variant on selection change, and renders adapted live signals each frame.
  // Fixed palettes — themes never touch this path (no color reactivity).
  const driveOriginals = (
    originalId: string,
    signals: ExperienceSignals,
    canvas3D: HTMLCanvasElement,
    canvasA: HTMLCanvasElement,
    canvasB: HTMLCanvasElement,
  ) => {
    try {
      viz3DRef.current ??= createNanoHexVisualizer(canvas3D);
      const entry = originalEntry(originalId);
      if (entry && viz3DVariantRef.current !== entry.variantId) {
        viz3DRef.current.setVariant(entry.variantId);
        viz3DVariantRef.current = entry.variantId;
      }
      viz3DRef.current.render(adaptSignals(signals, beatHoldRef.current));
      if (viz3DErrorRef.current) {
        viz3DErrorRef.current = null;
        setShaderError(null);
      }
    } catch (e) {
      const msg = `Originals 3D: ${e instanceof Error ? e.message : String(e)}`;
      if (viz3DErrorRef.current !== msg) {
        viz3DErrorRef.current = msg;
        setShaderError(msg);
      }
      return;
    }
    canvas3D.style.opacity = "1";
    canvasA.style.opacity = "0";
    canvasB.style.opacity = "0";
  };

  // Same ownership pattern for the immersive (UnrealBloom) visualizer on its
  // own canvas: room follows audio energy, crowd stays 0 (no fusion yet).
  const driveImmersive = (
    originalId: string,
    signals: ExperienceSignals,
    canvas4D: HTMLCanvasElement,
    canvasA: HTMLCanvasElement,
    canvasB: HTMLCanvasElement,
    canvas3D: HTMLCanvasElement | null,
  ) => {
    try {
      viz4DRef.current ??= createImmersiveVisualizer(canvas4D);
      const entry = originalEntry(originalId);
      if (entry && entry.kind === "immersive" && viz4DVariantRef.current !== entry.variantId) {
        viz4DRef.current.setScene(entry.variantId as ImmersiveId);
        viz4DVariantRef.current = entry.variantId;
      }
      viz4DRef.current.render(adaptImmersiveSignals(signals, beat4DRef.current, signals.energy));
      if (viz4DErrorRef.current) {
        viz4DErrorRef.current = null;
        setShaderError(null);
      }
    } catch (e) {
      const msg = `Immersive 3D: ${e instanceof Error ? e.message : String(e)}`;
      if (viz4DErrorRef.current !== msg) {
        viz4DErrorRef.current = msg;
        setShaderError(msg);
      }
      return;
    }
    canvas4D.style.opacity = "1";
    if (canvas3D) canvas3D.style.opacity = "0";
    canvasA.style.opacity = "0";
    canvasB.style.opacity = "0";
  };

  const compileToBack = (name: string, src: string, transition: { type: string; durationMs: number }) => {
    const back = frontIsARef.current ? rendererBRef.current : rendererRef.current;
    if (!back) return;
    const out = back.useFragment(src);
    if (!out.ok) {
      setShaderError(`${name}: ${out.error.split("\n")[0]}`);
      return;
    }
    setShaderError(null);
    const resolved = resolveStageTransition(transition);
    if (resolved.kind === "cut") {
      const showCanvas = frontIsARef.current ? canvasBRef.current : canvasRef.current;
      const hideCanvas = frontIsARef.current ? canvasRef.current : canvasBRef.current;
      if (showCanvas) showCanvas.style.opacity = "1";
      if (hideCanvas) hideCanvas.style.opacity = "0";
      frontIsARef.current = !frontIsARef.current;
      xfadeRef.current = null;
      return;
    }
    xfadeRef.current = { t0: performance.now(), ms: resolved.ms };
  };

  const applySceneLive = (intensity: number, speed: number, extra: [number, number, number]) => {
    liveRef.current = { intensity, speed, extra };
    const a = rendererRef.current;
    const b = rendererBRef.current;
    if (a) applyLiveToEngine(liveRef.current, a);
    if (b) applyLiveToEngine(liveRef.current, b);
  };

  const handleSceneEvent = (e: DirectorEvent) => {
    if (e.t === "scene") {
      applySceneLive(e.intensity, e.speed, e.extra);
      transitionRef.current = { type: e.transition.type, durationMs: e.transition.durationMs };
      if (generatedRef.current.has(e.visualId)) {
        if (generatedIdRef.current !== e.visualId) setGeneratedId(e.visualId);
        return;
      }
      const found = locateVisual(e.visualId);
      if (!found) return;
      setGeneratedId(null);
      if (packRef.current.id !== found.pack.id) setPack(found.pack);
      if (shaderIndexRef.current !== found.index) setShaderIndex(found.index);
      return;
    }
    if (e.t === "tweak") {
      applySceneLive(e.intensity, e.speed, e.extra);
      return;
    }
    if (e.t === "texture") {
      setTextureLayer(e.id === null ? null : { id: e.id, mix: e.texMix });
      setTexMixUI(e.texMix);
      return;
    }
    if (e.t === "hit") {
      // Drops punch the shader itself (beat response + energy swell),
      // never a light layer on top of it.
      boostCancelRef.current?.();
      const rs = [rendererRef.current, rendererBRef.current].filter((r): r is PapagedonRenderer => r !== null);
      boostCancelRef.current = punchBeatBoost(rs);
      return;
    }
    if (e.t === "blackout") {
      setBlackout(e.on);
    }
  };

  const setAuto = (v: boolean) => {
    directorAutoRef.current = v;
    setDirectorAuto(v);
  };

  const pickTheme = (id: string) => {
    setThemeId(id);
    setFlyerTheme(null);
    directorRef.current?.manual({});
  };

  const uploadFlyer = async (file: File) => {
    setFlyerBusy(true);
    setFlyerError(null);
    setFlyerNotice(null);
    try {
      const dataUrl = await downscaleImage(file);
      const res = await extractVerifiedTheme(dataUrl, { fileName: file.name });
      if (!res.ok || !res.theme) {
        setFlyerError(res.errors[0] ?? "Could not read that flyer.");
        return;
      }
      if (res.offline) {
        setFlyerNotice("Made on this device — the online read failed, so the colours come straight from the flyer.");
      }
      setEventTheme(res.theme);
      const roles = coerceRoles(res.theme.palette, res.theme.roles);
      setFlyerTheme(rolesToThemeDef(res.theme.eventName, roles));
      directorRef.current?.opening(res.theme);
    } catch (err) {
      setFlyerError(flyerPlainError(err));
    } finally {
      setFlyerBusy(false);
    }
  };

  const onGenerateVisuals = async () => {
    if (!eventTheme) return;
    setVisualsBusy(true);
    setVisualsStatus(null);
    try {
      const settled = await generateEventVisuals(eventTheme, ENERGY_TAGS);
      const imgs: PanelImage[] = settled.map((i) => ({
        id: i.id,
        energyTag: i.energyTag,
        enabled: true,
        dataUrl: i.dataUrl,
      }));
      setImages(imgs);
      directorRef.current?.setEventImages(
        imgs.map((i) => ({ id: i.id, energyTag: i.energyTag, enabled: i.enabled })),
      );
      setVisualsStatus(`${settled.length} artwork ${settled.length === 1 ? "image" : "images"} ready — blending over the show.`);
    } catch (err) {
      setVisualsStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setVisualsBusy(false);
    }
  };

  const onToggleImage = (id: string, enabled: boolean) => {
    setImages((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, enabled } : i));
      directorRef.current?.setEventImages(
        next.map((i) => ({ id: i.id, energyTag: i.energyTag, enabled: i.enabled })),
      );
      return next;
    });
  };

  const onTexMix = (v: number) => {
    setTexMixUI(v);
    directorRef.current?.manualTexture({ texMix: v });
  };

  const onGenerateShader = async () => {
    setShaderBusy(true);
    setShaderStatus(null);
    try {
      const settled = await generateEngineShader(eventTheme, {
        mood: eventTheme?.mood,
        energy: eventTheme?.energy,
      });
      if (!settled) {
        setShaderStatus("Kept the last good visual.");
        return;
      }
      const id = `gen-${Date.now().toString(36)}`;
      generatedRef.current.set(id, settled.glsl);
      setGeneratedId(id);
      setGeneratedCount((c) => c + 1);
      setShaderStatus("Your new look is on stage.");
    } finally {
      setShaderBusy(false);
    }
  };

  const compileAll = async () => {
    setDiag({ running: true, checked: 0, total: CATALOG.length, failures: [] });
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    let r: PapagedonRenderer | null = null;
    try {
      r = PapagedonRenderer.create(canvas);
    } catch {
      r = null;
    }
    if (!r) {
      setDiag({ running: false, checked: 0, total: CATALOG.length, failures: ["WebGL2 unavailable for the check"] });
      return;
    }
    const failures: string[] = [];
    let checked = 0;
    for (const c of CATALOG) {
      try {
        let src = shaderCache.current.get(c.file);
        if (!src) {
          const res = await fetch(withBasePath(ASSET_BASE + c.file));
          src = await res.text();
          shaderCache.current.set(c.file, src);
        }
        const out = r.useFragment(src);
        if (!out.ok) failures.push(`${c.id}: ${out.error.split("\n")[0]}`);
      } catch (err) {
        failures.push(`${c.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
      checked += 1;
      if (checked % 8 === 0) setDiag({ running: true, checked, total: CATALOG.length, failures: [...failures] });
    }
    r.dispose();
    setDiag({ running: false, checked, total: CATALOG.length, failures });
    logDecision({
      step: "verify",
      model: "local",
      input: `compile all (${CATALOG.length})`,
      result: failures.length === 0 ? "all clean" : `${failures.length} failed`,
      verify: failures.length === 0 ? { pass: true, reason: "all clean" } : { pass: false, reason: failures[0] },
      retries: 0,
      latencyMs: null,
    });
  };

  // three.js verifies only in a browser: build every original, render frames
  // with synthetic signals (one beat frame to fire the impact path), and
  // report per-original failures. Gaps between renders beat the frame throttle.
  const check3D = async () => {
    setDiag3d({ running: true, checked: 0, total: ORIGINALS.length, failures: [] });
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const canvas4 = document.createElement("canvas");
    canvas4.width = 320;
    canvas4.height = 240;
    let viz: NanoHexVisualizer | null = null;
    let viz4: ImmersiveViz | null = null;
    try {
      viz = createNanoHexVisualizer(canvas);
      viz4 = createImmersiveVisualizer(canvas4);
    } catch {
      viz = null;
      viz4 = null;
    }
    if (!viz || !viz4) {
      viz?.dispose();
      viz4?.dispose();
      setDiag3d({ running: false, checked: 0, total: ORIGINALS.length, failures: ["WebGL unavailable for the 3D check"] });
      return;
    }
    const failures: string[] = [];
    let checked = 0;
    const hold = createBeatHold();
    const hold4 = createBeatHold();
    for (const e of ORIGINALS) {
      try {
        if (e.kind === "immersive") {
          viz4.setScene(e.variantId as ImmersiveId);
          for (let f = 0; f < 3; f += 1) {
            viz4.render(adaptImmersiveSignals({ ...emptySignals(), energy: 0.7, bass: 0.8, mid: 0.5, treble: 0.4, beat: f === 1 }, hold4, 0.7));
            await sleep(45);
          }
        } else {
          viz.setVariant(e.variantId);
          for (let f = 0; f < 3; f += 1) {
            viz.render(adaptSignals({ ...emptySignals(), energy: 0.7, bass: 0.8, mid: 0.5, treble: 0.4, beat: f === 1 }, hold));
            await sleep(45);
          }
        }
      } catch (err) {
        failures.push(`${e.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
      checked += 1;
      setDiag3d({ running: true, checked, total: ORIGINALS.length, failures: [...failures] });
    }
    viz.dispose();
    viz4.dispose();
    setDiag3d({ running: false, checked, total: ORIGINALS.length, failures });
    logDecision({
      step: "verify",
      model: "local",
      input: `3d check (${ORIGINALS.length})`,
      result: failures.length === 0 ? "all clean" : `${failures.length} failed`,
      verify: failures.length === 0 ? { pass: true, reason: "all clean" } : { pass: false, reason: failures[0] },
      retries: 0,
      latencyMs: null,
    });
  };

  const { s, g } = hud;
  const textureImg = textureLayer ? images.find((i) => i.id === textureLayer.id && i.enabled) : undefined;

  return (
    <div
      className="pgx-root"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) void loadFile(f);
      }}
    >
      <canvas ref={canvasRef} className="pgx-stage" />
      <canvas ref={canvasBRef} className="pgx-stage" style={{ opacity: 0 }} />
      <canvas ref={canvas3DRef} className="pgx-stage" style={{ opacity: 0 }} />
      <canvas ref={canvas4DRef} className="pgx-stage" style={{ opacity: 0 }} />
      {textureImg && textureLayer && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            backgroundImage: `url(${textureImg.dataUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: textureLayer.mix,
            mixBlendMode: "screen",
          }}
        />
      )}
      {blackout && (
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none", background: "#000" }}
        />
      )}
      <video ref={cameraVideoRef} className={`pgx-camera-preview ${cameraOn ? "is-on" : ""}`} muted playsInline aria-label="Camera preview" />
      <canvas ref={cameraCanvasRef} className="hidden" aria-hidden="true" />
      {dragging && <div className="pgx-drop">Drop a track to play it through PAPAGEDON</div>}

      <div className="pgx-ui" style={{ opacity: hideUi ? 0 : 1, transition: "opacity .25s" }}>
        <nav className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href={withBasePath("/")} className="flex items-center gap-3" aria-label="PAPAGEDON home">
            <BrandLogo compact />
          </Link>
        </nav>

        {glError && (
          <div className="mx-4 rounded-lg border border-red-400/40 bg-red-950/60 p-3 text-sm md:mx-6">{glError}</div>
        )}

        {!source && !eventTheme && (
          <div className="mx-4 mt-3 rounded-lg border border-line bg-black/30 p-3 text-[12px] md:mx-6">
            <span className="font-heading text-[14px]">Start the show in 3 steps:</span>{" "}
            <span className="text-muted">1 · Play some music below&ensp;2 · Pick a look&ensp;3 · Add your flyer (optional)</span>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-y-auto px-4 pb-4 md:flex-row md:items-end md:px-6">
          <div className="flex w-full flex-col gap-3 md:w-[300px]">
            <Drawer title="Music in">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <label className={`pg-btn justify-center ${source === "file" ? "pg-btn-on" : ""}`}>
                  File
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
                </label>
                <button className={`pg-btn justify-center ${source === "input" ? "pg-btn-on" : ""}`} onClick={() => startInput(deviceId)}>
                  Mic / input
                </button>
                <button className={`pg-btn justify-center ${source === "loopback" ? "pg-btn-on" : ""}`} onClick={startLoopback}>
                  System
                </button>
                <button className={`pg-btn justify-center ${cameraOn ? "pg-btn-on" : ""}`} onClick={() => void toggleCamera()}>
                  {cameraOn ? "Camera on" : "Camera"}
                </button>
              </div>
              {source === "input" && devices.length > 1 && (
                <select className="pg-select mt-2" value={deviceId} onChange={(e) => { setDeviceId(e.target.value); void startInput(e.target.value); }}>
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
              )}
              <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate text-muted" title={sourceLabel}>{sourceLabel}</span>
                {source === "file" && (
                  <button className="pg-btn !px-2 !py-1" onClick={togglePlay}>{playing ? "Pause" : "Play"}</button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="pg-label">Reaction</span>
                {(["auto", "calm", "balanced", "wild"] as SensitivityMode[]).map((m) => (
                  <button
                    key={m}
                    className={`pg-btn !px-2 !py-1 ${sensMode === m ? "pg-btn-on" : ""}`}
                    onClick={() => setSensMode(m)}
                    title={m === "auto" ? "Learns the room and ignores background noise" : `Fixed ${m} response`}
                  >
                    {m[0].toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              {source && (
                <p className="mt-1 text-[11px] text-subtle">
                  {sensStatus === "learning" ? "Listening to the room…" : "Locked to this room — background noise ignored"}
                </p>
              )}
              {!source && <p className="mt-1 text-[11px] text-subtle">Drop a song anywhere, use the mic, or share your system sound.</p>}
              {sourceError && <p className="mt-1 text-[11px] text-red-300">{sourceError}</p>}
              {cameraError && (
                <div className="mt-1 flex items-start justify-between gap-2">
                  <p className="text-[11px] text-red-300">{cameraError}</p>
                  <button className="pg-btn shrink-0 !px-2 !py-1" onClick={() => void toggleCamera()}>Try again</button>
                </div>
              )}
              {cameraOn && <p className="mt-1 text-[11px] text-accent-soft">Camera active · preview pinned to the stage</p>}
              {cameraScene && (
                <div className="mt-2 rounded-md border border-line bg-black/20 p-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono uppercase tracking-widest text-muted">Scene read</span>
                    <span className="text-accent-soft">{Math.round(cameraScene.confidence * 100)}%</span>
                  </div>
                  <div className="mt-1 font-heading text-[15px]">{cameraScene.label}</div>
                  <div className="text-[10px] text-subtle">{cameraScene.detail}</div>
                  <button className={`pg-btn mt-2 w-full justify-center ${cameraDirector ? "pg-btn-on" : ""}`} onClick={() => setCameraDirector((value) => !value)}>
                    {cameraDirector ? "Auto visual response on" : "Enable auto visual response"}
                  </button>
                </div>
              )}
            </Drawer>

            <Drawer title="Looks">
              <select className="pg-select" value={pack.id} onChange={(e) => choosePack(e.target.value)} aria-label="Look pack">
                <optgroup label="Originals (3D)">
                  <option value={ORIGINALS_PACK.id}>{ORIGINALS_PACK.name} ({ORIGINALS_PACK.shaders.length})</option>
                </optgroup>
                <optgroup label="Engine packs">
                  {catalog.packs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.shaders.length})</option>
                  ))}
                </optgroup>
              </select>
              <div className="mt-2 flex items-center gap-1.5">
                <button className="pg-btn !px-2" onClick={() => step(-1)} aria-label="Previous look">[</button>
                <select className="pg-select" value={shaderIndex} onChange={(e) => {
                  const i = Number(e.target.value);
                  setShaderIndex(i);
                  setGeneratedId(null);
                  const sh = pack.shaders[i];
                  if (sh) directorRef.current?.manual({ visualId: sh.id });
                }}>
                  {pack.shaders.map((sh, i) => (
                    <option key={sh.id} value={i}>{String(i + 1).padStart(2, "0")} · {sh.name}</option>
                  ))}
                </select>
                <button className="pg-btn !px-2" onClick={() => step(1)} aria-label="Next look">]</button>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <select className="pg-select" value={themeId} onChange={(e) => pickTheme(e.target.value)}>
                  {catalog.themes.map((t, i) => (
                    <option key={t.id} value={t.id}>{i + 1} · {t.name}</option>
                  ))}
                </select>
                <button className={`pg-btn ${autoCycle ? "pg-btn-on" : ""}`} onClick={() => setAutoCycle((v) => !v)} title={`Next look every ${DEMO_CYCLE_SECONDS}s`}>
                  Auto
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="pg-label">Quality</span>
                <select className="pg-select" value={quality} onChange={(e) => setQuality(Number(e.target.value))} aria-label="Render quality">
                  <option value={1}>High</option>
                  <option value={0.65}>Medium</option>
                  <option value={0.4}>Low</option>
                </select>
              </div>
              {shaderError && <p className="mt-1 text-[11px] text-red-300">{shaderError}</p>}
            </Drawer>

            <Drawer title="Your event" panel="flyer">
              <FlyerPanel control={{ theme: eventTheme, busy: flyerBusy, error: flyerError, notice: flyerNotice, onFile: uploadFlyer }} />
            </Drawer>

            <Drawer
              title="Sound right now"
              defaultOpen={false}
              badge={
                <span className="font-mono text-[11px] text-muted">
                  <span key={beatFlash} className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent" style={{ animation: "pgxBeat .25s ease-out forwards" }} />
                  {s.bpm ? `${Math.round(s.bpm)} BPM` : "— BPM"} · {g.state}
                </span>
              }
            >
              <div className="grid gap-1.5">
                <Meter label="Energy" value={s.energy} />
                <Meter label="Bass" value={s.bass} />
                <Meter label="Mid" value={s.mid} />
                <Meter label="Treble" value={s.treble} />
              </div>
              <p className="mt-2 text-[10px] leading-snug text-subtle">
                Keys: Space play/pause · [ ] look · 1–9 colours · A auto · H hide.
              </p>
            </Drawer>
          </div>

          <div className="w-full md:w-[360px]" data-panel="director">
            <DirectorPanel
              control={{
                auto: directorAuto,
                setAuto,
                view: directorView,
                mode,
                samStatus,
                diag,
                onCompileAll: compileAll,
                diag3d,
                onCheck3D: check3D,
                shaderBusy,
                shaderStatus,
                generatedCount,
                onGenerateShader,
                visualsBusy,
                visualsStatus,
                images,
                onGenerateVisuals,
                onToggleImage,
                texMix: texMixUI,
                onTexMix,
                canGenerate: eventTheme !== null,
              }}
            />
          </div>
        </div>
      </div>
      <style>{`@keyframes pgxBeat { from { opacity: 1; transform: scale(1.6); } to { opacity: .25; transform: scale(1); } }`}</style>
    </div>
  );
}
