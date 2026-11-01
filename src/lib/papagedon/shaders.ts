/**
 * WebGL2 adapter for PAPAGEDON-CORE- fragment shaders.
 *
 * The engine's shaders are GLSL "330 core" / "460 core" fullscreen fragments
 * (in vec2 vUV; out vec4 fragColor). WebGL2 speaks GLSL ES 3.00, which is the
 * same language family, so the only change made here is swapping the
 * `#version` line for an ES header with default precisions. The shader bodies
 * are used exactly as they ship in the engine.
 */
export const VERTEX_SHADER = `#version 300 es
// Port of the engine's fullscreen triangle (gl_VertexID -> vUV).
out vec2 vUV;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUV = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

const ES_HEADER = "#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\n";

export function toWebGL2(source: string): string {
  const body = source.replace(/^\uFEFF?\s*#version[^\n]*\n/, "");
  return ES_HEADER + body;
}
