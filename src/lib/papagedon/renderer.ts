/**
 * WebGL2 renderer for PAPAGEDON-CORE- shaders.
 *
 * Uniform smoothing is ported from OpenGLRenderer::Render in
 * engine/rendering/backends/OpenGLRenderer.cpp (commit 4551dc4):
 *   - Follow(): one-pole asymmetric attack/release follower
 *   - beat pulse = preset.beatResponse (x0.28 in Trance mode), decays exp(-dt*14)
 *   - mood follows at 6/s, theme colours/look lerp at theme.transitionSpeed
 *   - evolutionPhase advances like the PGX preset-local phase
 * Not ported yet (native-only): the 10 randomised FBO transition effects,
 * the PGX feedback pass and the waveform overlay pass.
 */
import { kSpectrumBandCount, type ExperienceSignals } from "./analyzer";
import type { ExperienceGraphOutput } from "./experienceGraph";
import type { ThemeDef } from "./catalog";
import { VERTEX_SHADER, toWebGL2 } from "./shaders";

type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

function follow(current: number, target: number, dt: number, attack: number, release: number) {
  const rate = target > current ? attack : release;
  return current + (target - current) * (1 - Math.exp(-dt * rate));
}

const UNIFORMS = [
  "uTime", "uResolution", "uEnergy", "uIntensity", "uBass", "uMid", "uTreble", "uBeat", "uMood",
  "uPrimaryColour", "uSecondaryColour", "uAccentColour", "uBackground", "uGlow", "uBloom", "uMotion",
  "uNoise", "uDistortion", "uSaturationBase", "uSaturationScale", "uDetail", "uMasterBrightness",
  "uMasterGlow", "uMasterExposure", "uEvolutionPhase", "uSpectrum",
] as const;
type UniformName = (typeof UNIFORMS)[number];

export type CompileResult = { ok: true } | { ok: false; error: string };

export class PapagedonRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly vs: WebGLShader;
  private program: WebGLProgram | null = null;
  private loc: Partial<Record<UniformName, WebGLUniformLocation | null>> = {};
  private readonly spectrumTex: WebGLTexture;
  private readonly spectrumBytes = new Uint8Array(kSpectrumBandCount);
  private readonly vao: WebGLVertexArrayObject;
  private readonly start = performance.now();

  // Persistent smoothed uniforms (ShaderUniforms in the engine).
  private s = {
    energy: 0, intensity: 0, bass: 0, mid: 0, treble: 0, beat: 0, mood: 0,
    primary: [0, 0, 0] as RGB, secondary: [0, 0, 0] as RGB, accent: [0, 0, 0] as RGB, background: [0, 0, 0] as RGB,
    glow: 0, bloom: 0.35, motion: 1, noise: 0, distortion: 1,
    saturationBase: 0.15, saturationScale: 0.85, phase: 0,
  };
  private theme: ThemeDef | null = null;

  /** ExperiencePreset defaults (engine/experience/presets/ExperiencePreset.h). */
  preset = { beatResponse: 1, energyMultiplier: 1, saturationBase: 0.15, saturationScale: 0.85, transitionSpeed: 6 };
  /** ShowMode::Trance softens the beat punch and slows evolution. */
  tranceMode = false;
  /** Director speed multiplier on the evolution phase (AEI addition). */
  speed = 1;
  /** Render quality 0..1 driving uDetail (AEI addition). */
  detail = 1;
  /** DebugState::audioAttackRate default (Runtime sets it from InputLatency). */
  attackRate = 100;
  master = { brightness: 1, glow: 1, exposure: 1 };

  static create(canvas: HTMLCanvasElement): PapagedonRenderer | null {
    const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false });
    return gl ? new PapagedonRenderer(gl) : null;
  }

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const vs = this.compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    if ("error" in vs) throw new Error(vs.error);
    this.vs = vs.shader;
    this.vao = gl.createVertexArray()!;
    this.spectrumTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.spectrumTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, kSpectrumBandCount, 1, 0, gl.RED, gl.UNSIGNED_BYTE, this.spectrumBytes);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private compile(type: number, src: string): { shader: WebGLShader } | { error: string } {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(sh) ?? "compile failed";
      gl.deleteShader(sh);
      return { error };
    }
    return { shader: sh };
  }

  /** Compiles an engine fragment shader. On failure the previous one keeps running. */
  useFragment(engineSource: string): CompileResult {
    const gl = this.gl;
    const fs = this.compile(gl.FRAGMENT_SHADER, toWebGL2(engineSource));
    if ("error" in fs) return { ok: false, error: fs.error };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, this.vs);
    gl.attachShader(prog, fs.shader);
    gl.linkProgram(prog);
    gl.deleteShader(fs.shader);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(prog) ?? "link failed";
      gl.deleteProgram(prog);
      return { ok: false, error };
    }
    if (this.program) gl.deleteProgram(this.program);
    this.program = prog;
    this.loc = {};
    for (const u of UNIFORMS) this.loc[u] = gl.getUniformLocation(prog, u);
    this.s.phase = 0;
    return { ok: true };
  }

  setTheme(theme: ThemeDef, immediate = false) {
    this.theme = theme;
    if (immediate) {
      this.s.primary = hex(theme.palette.primary);
      this.s.secondary = hex(theme.palette.secondary);
      this.s.accent = hex(theme.palette.accent);
      this.s.background = hex(theme.palette.background);
    }
  }

  render(signals: ExperienceSignals, graph: ExperienceGraphOutput, dtRaw: number) {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const dt = Math.min(Math.max(dtRaw, 0), 0.1);
    const s = this.s;
    const kAttack = this.attackRate;
    const kRelease = 12;

    s.energy = follow(s.energy, Math.min(Math.max(signals.energy * this.preset.energyMultiplier, 0), 1), dt, kAttack, kRelease);
    s.intensity = follow(s.intensity, signals.intensity, dt, kAttack, kRelease);
    s.bass = follow(s.bass, signals.bass, dt, kAttack, kRelease);
    s.mid = follow(s.mid, signals.mid, dt, kAttack, kRelease);
    s.treble = follow(s.treble, signals.treble, dt, kAttack, kRelease);
    if (signals.beat) s.beat = this.preset.beatResponse * (this.tranceMode ? 0.28 : 1);
    else s.beat *= Math.exp(-dt * 14);
    s.mood = follow(s.mood, graph.mood, dt, 6, 6);

    if (this.theme) {
      const t = this.theme;
      const a = 1 - Math.exp(-dt * Math.max(t.transitionSpeed ?? 6, 0));
      const lerp = (c: RGB, target: string): RGB => {
        const x = hex(target);
        return [c[0] + (x[0] - c[0]) * a, c[1] + (x[1] - c[1]) * a, c[2] + (x[2] - c[2]) * a];
      };
      s.primary = lerp(s.primary, t.palette.primary);
      s.secondary = lerp(s.secondary, t.palette.secondary);
      s.accent = lerp(s.accent, t.palette.accent);
      s.background = lerp(s.background, t.palette.background);
      s.glow += ((t.glow ?? 0) - s.glow) * a;
      s.bloom += ((t.bloom ?? 0.35) - s.bloom) * a;
      s.motion += ((t.motion ?? 1) - s.motion) * a;
      s.noise += ((t.noise ?? 0) - s.noise) * a;
      s.distortion += ((t.distortion ?? 1) - s.distortion) * a;
    }
    const pa = 1 - Math.exp(-dt * Math.max(this.preset.transitionSpeed, 0));
    s.saturationBase += (this.preset.saturationBase - s.saturationBase) * pa;
    s.saturationScale += (this.preset.saturationScale - s.saturationScale) * pa;
    s.phase += dt * this.speed * (this.tranceMode ? 0.35 : 0.55 + s.energy * 1.6 + s.bass * 0.8 + s.beat * 2.0);

    for (let i = 0; i < kSpectrumBandCount; i++) this.spectrumBytes[i] = Math.round(signals.spectrum[i] * 255);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.spectrumTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, kSpectrumBandCount, 1, gl.RED, gl.UNSIGNED_BYTE, this.spectrumBytes);

    gl.viewport(0, 0, w, h);
    if (!this.program) {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    gl.useProgram(this.program);
    const L = this.loc;
    const f1 = (n: UniformName, v: number) => L[n] && gl.uniform1f(L[n]!, v);
    const f3 = (n: UniformName, v: RGB) => L[n] && gl.uniform3f(L[n]!, v[0], v[1], v[2]);
    f1("uTime", (performance.now() - this.start) / 1000);
    if (L.uResolution) gl.uniform2f(L.uResolution, w, h);
    f1("uEnergy", s.energy);
    f1("uIntensity", s.intensity);
    f1("uBass", s.bass);
    f1("uMid", s.mid);
    f1("uTreble", s.treble);
    f1("uBeat", s.beat);
    f1("uMood", s.mood);
    f3("uPrimaryColour", s.primary);
    f3("uSecondaryColour", s.secondary);
    f3("uAccentColour", s.accent);
    f3("uBackground", s.background);
    f1("uGlow", s.glow);
    f1("uBloom", s.bloom);
    f1("uMotion", s.motion);
    f1("uNoise", s.noise);
    f1("uDistortion", s.distortion);
    f1("uSaturationBase", s.saturationBase);
    f1("uSaturationScale", s.saturationScale);
    f1("uDetail", this.detail);
    f1("uMasterBrightness", this.master.brightness);
    f1("uMasterGlow", this.master.glow);
    f1("uMasterExposure", this.master.exposure);
    f1("uEvolutionPhase", s.phase);
    if (L.uSpectrum) gl.uniform1i(L.uSpectrum, 0);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    gl.deleteShader(this.vs);
    gl.deleteTexture(this.spectrumTex);
    gl.deleteVertexArray(this.vao);
  }
}
