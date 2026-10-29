import { describe, expect, test } from 'vitest';
import { M3_TAG, verifyVisualizer } from './verifyVisualizer';

const GLSL =
  'precision mediump float;\n' +
  'uniform float u_time;\n' +
  'uniform vec2 u_resolution;\n' +
  'uniform vec3 u_palette[4];\n' +
  'void main() { gl_FragColor = vec4(u_palette[0], 1.0); }\n';

function validDef() {
  return {
    id: 'test-visual',
    name: 'Test Visual',
    fragmentGlsl: GLSL,
    uniforms: ['u_time'],
    tags: [M3_TAG],
    params: [{ key: 'p1', label: 'Glow', min: 0, max: 1, def: 0.5 }],
  };
}

describe('verifyVisualizer', () => {
  test('accepts a valid definition', () => {
    expect(verifyVisualizer(validDef())).toEqual({ ok: true, errors: [] });
  });

  test('rejects a non-object', () => {
    expect(verifyVisualizer(null).ok).toBe(false);
  });

  test('rejects missing id or name', () => {
    const d = validDef() as unknown as Record<string, unknown>;
    delete d.id;
    d.name = '';
    const r = verifyVisualizer(d);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('missing or empty: id');
    expect(r.errors).toContain('missing or empty: name');
  });

  test('rejects tags without the m3 marker', () => {
    const r = verifyVisualizer({ ...validDef(), tags: ['other'] });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain(`tags must include '${M3_TAG}'`);
  });

  test('rejects params outside their declared range', () => {
    const bad = {
      ...validDef(),
      params: [{ key: 'p1', label: 'Glow', min: 0, max: 1, def: 2 }],
    };
    const r = verifyVisualizer(bad);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('param \'p1\' must satisfy min <= def <= max with numbers');
  });

  test('rejects inverted param ranges', () => {
    const bad = {
      ...validDef(),
      params: [{ key: 'p1', label: 'Glow', min: 1, max: 0, def: 0.5 }],
    };
    expect(verifyVisualizer(bad).ok).toBe(false);
  });

  test('rejects params without key or label', () => {
    const bad = { ...validDef(), params: [{ min: 0, max: 1, def: 0.5 }] };
    const r = verifyVisualizer(bad);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('each param needs a string key and label');
  });

  test('rejects GLSL without void main', () => {
    const r = verifyVisualizer({ ...validDef(), fragmentGlsl: 'precision mediump float;' });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('fragmentGlsl must contain void main');
  });

  test('rejects GLSL missing required uniforms', () => {
    const r = verifyVisualizer({ ...validDef(), fragmentGlsl: 'void main() {}' });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('fragmentGlsl must declare u_time');
    expect(r.errors).toContain('fragmentGlsl must declare u_resolution');
    expect(r.errors).toContain('fragmentGlsl must declare u_palette');
  });
});
