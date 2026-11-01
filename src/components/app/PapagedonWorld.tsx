"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

const VERT = `
attribute vec2 a;
void main(){ gl_Position = vec4(a,0.0,1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uBass, uMid, uTreble, uEnergy, uLook;
void main(){
  vec2 uv = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;
  uv.x *= uRes.x / max(uRes.y, 1.0);
  float t = uTime;
  float e = uEnergy;
  float b = uBass;
  vec3 col = vec3(0.01, 0.03, 0.02);
  float look = floor(uLook + 0.5);

  if (look < 0.5) {
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    float pulse = 0.35 + b * 0.55;
    float ring = exp(-pow((r - pulse) / 0.05, 2.0));
    float rays = pow(abs(sin(a * 18.0 + t)), 12.0) * exp(-r * 2.2);
    col += vec3(0.2, 0.95, 0.35) * (ring * 1.6 + rays * e);
  } else if (look < 1.5) {
    vec2 p = uv;
    float z = fract(t * 0.12 + b);
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      vec2 q = p * (1.2 + fi * 0.18) * (0.6 + z);
      float g = min(abs(fract(q.x * 4.0) - 0.5), abs(fract(q.y * 4.0) - 0.5));
      col += vec3(0.15, 0.9, 0.4) * (1.0 - smoothstep(0.0, 0.04, g)) * (0.15 / (fi + 1.0)) * (0.4 + e);
    }
  } else if (look < 2.5) {
    float n = sin(uv.x * 8.0 + t) * sin(uv.y * 7.0 - t * 0.7);
    float fog = 0.5 + 0.5 * n;
    col += vec3(0.08, 0.55, 0.42) * fog * (0.35 + uMid);
    col += vec3(0.9, 0.95, 0.4) * pow(max(0.0, 1.0 - length(uv)), 3.0) * (0.2 + b);
  } else {
    float r = length(uv);
    float a = atan(uv.y, uv.x) + t * 0.4;
    float pet = abs(sin(a * 8.0));
    float flower = smoothstep(0.55 + b * 0.2, 0.1, r / (0.35 + pet * 0.35));
    col += vec3(0.25, 1.0, 0.55) * flower * (0.4 + e);
  }

  col += vec3(0.05, 0.12, 0.08) * uTreble;
  gl_FragColor = vec4(col, 1.0);
}
`;

const LOOKS = ["Pulse ring", "Tunnel grid", "Deep fog", "Bloom"];

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export default function PapagedonWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [look, setLook] = useState(0);
  const [status, setStatus] = useState("drop a song or use the mic");
  const lookRef = useRef(0);
  const audioRef = useRef<{
    ctx: AudioContext;
    analyser: AnalyserNode;
    src?: MediaStreamAudioSourceNode | MediaElementAudioSourceNode;
    el?: HTMLAudioElement;
    stream?: MediaStream;
  } | null>(null);

  useEffect(() => {
    lookRef.current = look;
  }, [look]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) {
      setStatus("this browser cannot draw the world");
      return;
    }
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "a");
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const loc = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      bass: gl.getUniformLocation(prog, "uBass"),
      mid: gl.getUniformLocation(prog, "uMid"),
      treble: gl.getUniformLocation(prog, "uTreble"),
      energy: gl.getUniformLocation(prog, "uEnergy"),
      look: gl.getUniformLocation(prog, "uLook"),
    };
    const bins = new Uint8Array(1024);
    let raf = 0;
    const start = performance.now();
    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      let bass = 0, mid = 0, treble = 0;
      const a = audioRef.current?.analyser;
      if (a) {
        a.getByteFrequencyData(bins);
        const n = a.frequencyBinCount;
        for (let i = 0; i < n; i++) {
          const v = bins[i] / 255;
          if (i < n * 0.08) bass += v;
          else if (i < n * 0.4) mid += v;
          else treble += v;
        }
        bass /= n * 0.08;
        mid /= n * 0.32;
        treble /= n * 0.6;
      }
      const energy = Math.min(1, bass * 0.55 + mid * 0.3 + treble * 0.15);
      gl.uniform2f(loc.res, w, h);
      gl.uniform1f(loc.time, (performance.now() - start) / 1000);
      gl.uniform1f(loc.bass, bass);
      gl.uniform1f(loc.mid, mid);
      gl.uniform1f(loc.treble, treble);
      gl.uniform1f(loc.energy, energy);
      gl.uniform1f(loc.look, lookRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const boot = async () => {
    if (audioRef.current) return audioRef.current.ctx;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.connect(ctx.destination);
    audioRef.current = { ctx, analyser };
    return ctx;
  };

  const playFile = async (file: File) => {
    const ctx = await boot();
    await ctx.resume();
    const url = URL.createObjectURL(file);
    const el = new Audio(url);
    el.crossOrigin = "anonymous";
    el.loop = true;
    const src = ctx.createMediaElementSource(el);
    const pack = audioRef.current!;
    pack.src?.disconnect();
    pack.el?.pause();
    src.connect(pack.analyser);
    el.play();
    pack.src = src;
    pack.el = el;
    setStatus(file.name);
  };

  const useMic = async () => {
    try {
      const ctx = await boot();
      await ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const src = ctx.createMediaStreamSource(stream);
      const pack = audioRef.current!;
      pack.src?.disconnect();
      pack.el?.pause();
      src.connect(pack.analyser);
      pack.src = src;
      pack.stream = stream;
      setStatus("listening");
    } catch {
      setStatus("mic blocked — drop a song instead");
    }
  };

  return (
    <div
      className="pg-app"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) void playFile(file);
      }}
    >
      <canvas ref={canvasRef} />
      <header className="pg-app-nav">
        <Link href="/" className="music-mark"><BrandLogo compact /></Link>
        <span style={{ display: "flex", gap: "1.4rem" }}>
          <Link href="/music">MUSIC ↗</Link>
          <Link href="/portfolio">PORTFOLIO ↗</Link>
        </span>
      </header>
      <div className="pg-app-hud">
        <p>03 / APP</p>
        <h1>THE<br />WORLD</h1>
        <p>PAPAGEDON turns music into a world you can walk into. Drop a song, or let it hear the room.</p>
        <div className="pg-app-actions">
          <label>
            DROP / PICK A SONG
            <input
              type="file"
              accept="audio/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void playFile(file);
              }}
            />
          </label>
          <button type="button" onClick={() => void useMic()}>USE MIC</button>
          <button
            type="button"
            onClick={() => setLook((n) => (n + 1) % LOOKS.length)}
          >
            NEXT LOOK
          </button>
        </div>
        <p className="pg-app-gate">Desktop director with memory: GitHub Daddymuphasa/PAPAGEDON-</p>
      </div>
      <p className="pg-app-meta">{LOOKS[look]} · {status}</p>
    </div>
  );
}
