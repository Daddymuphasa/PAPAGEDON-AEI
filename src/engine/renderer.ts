// Full-screen WebGL renderer. Compiles a ShaderDefinition once, draws every
// frame from live AudioFeatures + the director's latest ScenePlan.
import type { AudioFeatures, ScenePlan, ShaderDefinition } from '../types';

const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Short palettes repeat the nearest slot — never pad with black bands.
function slot(palette: string[], i: number): string {
  if (palette.length === 0) return '#202020';
  return palette[Math.min(i, palette.length - 1)] ?? '#202020';
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('shader alloc failed');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('shader compile failed: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

// M8 segmentation uniforms: combined mask strength (0 = tail no-op),
// performer box xywh normalized (y=0 top), crowd motion 0-1.
export interface SegUniforms {
  mix: number;
  box: [number, number, number, number];
  motion: number;
}

export const NO_SEG: SegUniforms = { mix: 0, box: [0, 0, 0, 0], motion: 0 };

// M9-B shader quality knob: 0 low, 1 med (default), 2 high. Compiled in
// as AEI_QUALITY; shaders scale loop counts and raymarch steps on it.
export type RenderQuality = 0 | 1 | 2;
export const DEFAULT_QUALITY: RenderQuality = 1;

export class Renderer {
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram | null = null;
  private eventTex: WebGLTexture | null = null;
  private eventReady = false;
  private segTex: WebGLTexture | null = null;
  private segReady = false;
  private quality: RenderQuality = DEFAULT_QUALITY;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL is not available');
    this.gl = gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  }

  // Takes effect on the next compile — callers re-acquire programs
  // (tryCompile/setShader) after changing it.
  setQuality(q: RenderQuality): void {
    this.quality = q;
  }

  setShader(shader: ShaderDefinition): void {
    this.prog = this.buildProgram(shader);
    this.gl.useProgram(this.prog);
  }

  private buildProgram(shader: ShaderDefinition): WebGLProgram {
    const { gl } = this;
    const prog = gl.createProgram();
    if (!prog) throw new Error('program alloc failed');
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, `#define AEI_QUALITY ${this.quality}\n${shader.fragmentGlsl}`));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('shader link failed: ' + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  // M3: non-throwing compile for registration-time verification.
  tryCompile(shader: ShaderDefinition): { prog: WebGLProgram } | { error: string } {
    try {
      return { prog: this.buildProgram(shader) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  // M7: upload an event image as the shared u_eventTex layer. Null clears
  // it (shaders fall back to mix 0). CLAMP + LINEAR keeps NPOT art legal.
  setEventTexture(img: TexImageSource | null): void {
    const { gl } = this;
    if (img === null) {
      this.eventReady = false;
      return;
    }
    if (!this.eventTex) {
      const tex = gl.createTexture();
      if (!tex) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.eventTex = tex;
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.eventTex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      this.eventReady = true;
    } catch {
      this.eventReady = false;
    }
  }

  // M8: upload a segmentation grid as the shared u_segMask layer (R =
  // performer, G = crowd, row 0 = image top). Null clears it (shaders
  // fall back to mix 0). CLAMP + LINEAR keeps small grids legal.
  setSegMask(data: Uint8Array | Uint8ClampedArray | null, w: number, h: number): void {
    const { gl } = this;
    if (data === null || w <= 0 || h <= 0 || data.length < w * h * 4) {
      this.segReady = false;
      return;
    }
    if (!this.segTex) {
      const tex = gl.createTexture();
      if (!tex) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.segTex = tex;
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.segTex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      this.segReady = true;
    } catch {
      this.segReady = false;
    }
  }

  render(time: number, f: AudioFeatures, plan: ScenePlan): void {
    const { gl, canvas, prog } = this;
    if (!prog) return;
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    gl.uniform1f(u('u_time'), time);
    gl.uniform1f(u('u_bass'), f.bass);
    gl.uniform1f(u('u_mid'), f.mid);
    gl.uniform1f(u('u_high'), f.high);
    gl.uniform1f(u('u_beat'), f.beat ? 1 : 0);
    gl.uniform1f(u('u_intensity'), plan.intensity);
    gl.uniform2f(u('u_resolution'), canvas.width, canvas.height);
    gl.uniform3fv(
      u('u_palette'),
      [0, 1, 2, 3].flatMap((i) => hexToRgb(slot(plan.palette, i))),
    );
    const a = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---- M3 gallery path: palette comes from the panel, never from a theme ----

  private targets: { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }[] = [];
  private mixProg: WebGLProgram | null = null;

  private sizeCanvas(scale: number): void {
    const { canvas } = this;
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  private drawTri(prog: WebGLProgram): void {
    const { gl } = this;
    const a = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private setVisualUniforms(
    prog: WebGLProgram,
    time: number,
    f: AudioFeatures,
    palette: string[],
    intensity: number,
    speed: number,
    pulse: number,
    extra: [number, number, number],
    w: number,
    h: number,
    texMix: number,
    seg: SegUniforms,
  ): void {
    const { gl } = this;
    const u = (n: string) => gl.getUniformLocation(prog, n);
    gl.uniform1f(u('u_time'), time);
    gl.uniform1f(u('u_bass'), f.bass);
    gl.uniform1f(u('u_mid'), f.mid);
    gl.uniform1f(u('u_high'), f.high);
    gl.uniform1f(u('u_beat'), f.beat ? 1 : 0);
    gl.uniform1f(u('u_energy'), f.energy);
    gl.uniform1f(u('u_bpm'), f.bpm);
    gl.uniform1f(u('u_intensity'), intensity);
    gl.uniform1f(u('u_speed'), speed);
    gl.uniform1f(u('u_pulse'), pulse);
    gl.uniform1f(u('u_p1'), extra[0]);
    gl.uniform1f(u('u_p2'), extra[1]);
    gl.uniform1f(u('u_p3'), extra[2]);
    // M7 event-art layer on texture unit 2 (the FBO mix pass owns 0-1).
    // Shaders without these uniforms get null locations — silent no-ops.
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.eventTex);
    gl.uniform1i(u('u_eventTex'), 2);
    gl.uniform1f(u('u_texMix'), this.eventReady && this.eventTex ? texMix : 0);
    // M8 segmentation layer on texture unit 3 (FBO mix owns 0-1, event
    // art owns 2). Mix 0 disables the tail, so the gallery is untouched.
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.segTex);
    gl.uniform1i(u('u_segMask'), 3);
    gl.uniform4f(u('u_perfBox'), seg.box[0], seg.box[1], seg.box[2], seg.box[3]);
    gl.uniform1f(u('u_motion'), this.segReady && this.segTex ? seg.motion : 0);
    gl.uniform1f(u('u_segMix'), this.segReady && this.segTex ? seg.mix : 0);
    gl.uniform2f(u('u_resolution'), w, h);
    gl.uniform3fv(
      u('u_palette'),
      [0, 1, 2, 3].flatMap((i) => hexToRgb(slot(palette, i))),
    );
  }

  // Steady-state gallery draw: one program, one draw call, direct to canvas.
  renderVisual(
    time: number,
    f: AudioFeatures,
    palette: string[],
    intensity: number,
    speed: number,
    pulse: number,
    extra: [number, number, number],
    scale: number,
    texMix = 0,
    seg: SegUniforms = NO_SEG,
  ): void {
    const { gl, canvas, prog } = this;
    if (!prog) return;
    this.sizeCanvas(scale);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    this.setVisualUniforms(prog, time, f, palette, intensity, speed, pulse, extra, canvas.width, canvas.height, texMix, seg);
    this.drawTri(prog);
  }

  private target(i: number, w: number, h: number): { fb: WebGLFramebuffer; tex: WebGLTexture } {
    const { gl } = this;
    let t = this.targets[i];
    if (!t) {
      const fb = gl.createFramebuffer();
      const tex = gl.createTexture();
      if (!fb || !tex) throw new Error('FBO alloc failed');
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      t = { fb, tex, w: 0, h: 0 };
      this.targets[i] = t;
    }
    if (t.w !== w || t.h !== h) {
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      t.w = w;
      t.h = h;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    return t;
  }

  private ensureMixProg(): WebGLProgram {
    if (!this.mixProg) {
      this.mixProg = this.buildProgram({
        id: 'mix',
        name: 'mix',
        fragmentGlsl:
          'precision mediump float;\n' +
          'uniform sampler2D u_a;\n' +
          'uniform sampler2D u_b;\n' +
          'uniform float u_mix;\n' +
          'uniform vec2 u_resolution;\n' +
          'void main() {\n' +
          '  vec2 uv = gl_FragCoord.xy / u_resolution;\n' +
          '  vec3 a = texture2D(u_a, uv).rgb;\n' +
          '  vec3 b = texture2D(u_b, uv).rgb;\n' +
          '  gl_FragColor = vec4(mix(a, b, u_mix), 1.0);\n' +
          '}\n',
        uniforms: [],
      });
    }
    return this.mixProg;
  }

  // Crossfade: both programs render to targets, then one mix blit to canvas.
  renderCrossfade(
    time: number,
    f: AudioFeatures,
    palette: string[],
    intensity: number,
    speed: number,
    pulse: number,
    extra: [number, number, number],
    scale: number,
    fromProg: WebGLProgram,
    toProg: WebGLProgram,
    mix: number,
    texMix = 0,
    seg: SegUniforms = NO_SEG,
  ): void {
    const { gl, canvas } = this;
    this.sizeCanvas(scale);
    const w = canvas.width;
    const h = canvas.height;
    const progs = [fromProg, toProg];
    for (let i = 0; i < 2; i++) {
      this.target(i, w, h);
      gl.viewport(0, 0, w, h);
      gl.useProgram(progs[i]);
      this.setVisualUniforms(progs[i], time, f, palette, intensity, speed, pulse, extra, w, h, texMix, seg);
      this.drawTri(progs[i]);
    }
    const mixProg = this.ensureMixProg();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(mixProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.targets[0].tex);
    gl.uniform1i(gl.getUniformLocation(mixProg, 'u_a'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.targets[1].tex);
    gl.uniform1i(gl.getUniformLocation(mixProg, 'u_b'), 1);
    gl.uniform1f(gl.getUniformLocation(mixProg, 'u_mix'), mix);
    gl.uniform2f(gl.getUniformLocation(mixProg, 'u_resolution'), w, h);
    this.drawTri(mixProg);
  }
}
