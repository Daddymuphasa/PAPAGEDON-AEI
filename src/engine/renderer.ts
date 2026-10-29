// Full-screen WebGL renderer. Compiles a ShaderDefinition once, draws every
// frame from live AudioFeatures + the director's latest ScenePlan.
import type { AudioFeatures, ScenePlan, ShaderDefinition } from '../types';

const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
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

export class Renderer {
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL is not available');
    this.gl = gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  }

  setShader(shader: ShaderDefinition): void {
    const { gl } = this;
    const prog = gl.createProgram();
    if (!prog) throw new Error('program alloc failed');
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, shader.fragmentGlsl));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('shader link failed: ' + gl.getProgramInfoLog(prog));
    }
    this.prog = prog;
    gl.useProgram(prog);
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
      [0, 1, 2, 3].flatMap((i) => hexToRgb(plan.palette[i] ?? '#000000')),
    );
    const a = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
