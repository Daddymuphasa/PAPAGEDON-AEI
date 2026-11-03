// Signature pack: every rewritten shader passes the engine authoring
// contract statically (interface, banned tokens, braces). The browser
// Shader check remains the authoritative compile gate.
import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanShaderSource } from '../src/visuals/shaderContract';

const DIR = join(__dirname, '..', 'public', 'papagedon-core', 'shaders', 'SignaturePack');

describe('signature pack', () => {
  test('twelve shaders, all contract-clean', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.frag')).sort();
    expect(files).toHaveLength(12);
    for (const f of files) {
      const raw = readFileSync(join(DIR, f), 'utf8');
      expect(raw.startsWith('#version 300 es\n'), `${f}: missing ES header`).toBe(true);
      // The runtime strips the on-disk header before compiling (toWebGL2):
      // scan the same body the browser sees.
      const src = raw.replace(/^\uFEFF?\s*#version[^\n]*\n/, '');
      const scan = scanShaderSource(src);
      expect(scan.errors, `${f}: ${scan.errors.join('; ')}`).toEqual([]);
      expect(scan.ok, f).toBe(true);
    }
  });
});
