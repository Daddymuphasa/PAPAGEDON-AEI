import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_SHADER_CONTRACT, mockEngineShader, scanShaderSource } from './shaderContract';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

describe('shaderContract', () => {
  test('mock shader passes the static scan', () => {
    const scan = scanShaderSource(mockEngineShader());
    expect(scan.errors).toEqual([]);
    expect(scan.ok).toBe(true);
  });

  test('template file passes the static scan', () => {
    const src = readFileSync(join(root, 'shaders', 'engine-template.frag'), 'utf8');
    expect(scanShaderSource(src).ok).toBe(true);
  });

  test('contract names the required interface', () => {
    for (const token of ['in vec2 vUV', 'out vec4 fragColor', 'uTime', 'uPrimaryColour', 'ES 3.00']) {
      expect(ENGINE_SHADER_CONTRACT.includes(token)).toBe(true);
    }
  });

  test('rejects desktop-isms and missing interface', () => {
    expect(scanShaderSource('void main() { gl_FragColor = vec4(1.0); }').ok).toBe(false);
    const bad = scanShaderSource('varying vec2 v; void main() {}');
    expect(bad.ok).toBe(false);
    expect(bad.errors.join(' ')).toContain('varying');
    expect(scanShaderSource('in vec2 vUV; out vec4 fragColor; void main() {{}').ok).toBe(false);
  });

  test('comments may name banned tokens without failing', () => {
    const src = [
      '// Doc line: no #version, gl_FragColor, texture2D, varying or attribute here.',
      '/* Block comment with { braces } and dvec3. */',
      'in vec2 vUV;',
      'out vec4 fragColor;',
      'void main() { fragColor = vec4(vUV, 0.0, 1.0); } // trailing { note',
    ].join('\n');
    const scan = scanShaderSource(src);
    expect(scan.errors).toEqual([]);
    expect(scan.ok).toBe(true);
  });
});
