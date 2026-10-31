// M3 registration gate: a visualizer is only registered after it passes
// static checks, compiles, and holds the fps budget in a short benchmark.
// Failures are logged to the decision log and never registered.
import type { ShaderDefinition } from '../src/types';
import type { Renderer } from '../src/engine/renderer';
import { DEFAULT_VISUAL_PARAMS } from '../src/engine/visualParams';
import { mockFeatures } from '../src/inputs/audio/localAnalyzer';
import { logDecision } from '../src/director/decisionLog';
import { getShader, registerShader } from './registry';

export const M3_TAG = 'm3-visual';
export const LIB_TAG = 'shader-library';
export const MIN_BENCHMARK_FPS = 30;
export const BENCHMARK_FRAMES = 60;
const REQUIRED_UNIFORMS = ['u_time', 'u_resolution', 'u_palette'];

export interface VisualVerifyResult {
  ok: boolean;
  errors: string[];
}

// Pure static checks. Runs in Node tests as well as the browser.
export function verifyVisualizer(def: unknown): VisualVerifyResult {
  const errors: string[] = [];
  if (typeof def !== 'object' || def === null) {
    return { ok: false, errors: ['definition is not an object'] };
  }
  const d = def as Record<string, unknown>;
  if (typeof d.id !== 'string' || !d.id.trim()) errors.push('missing or empty: id');
  if (typeof d.name !== 'string' || !d.name.trim()) errors.push('missing or empty: name');
  if (!Array.isArray(d.tags) || (!d.tags.includes(M3_TAG) && !d.tags.includes(LIB_TAG))) {
    errors.push(`tags must include '${M3_TAG}' or '${LIB_TAG}'`);
  }
  if (!Array.isArray(d.params)) {
    errors.push('params must be an array');
  } else {
    for (const p of d.params) {
      const v = p as Record<string, unknown>;
      if (typeof v?.key !== 'string' || typeof v?.label !== 'string') {
        errors.push('each param needs a string key and label');
        continue;
      }
      if (
        typeof v.min !== 'number' ||
        typeof v.max !== 'number' ||
        typeof v.def !== 'number' ||
        v.min > v.def ||
        v.def > v.max
      ) {
        errors.push(`param '${v.key}' must satisfy min <= def <= max with numbers`);
      }
    }
  }
  if (typeof d.fragmentGlsl !== 'string' || !d.fragmentGlsl.includes('void main')) {
    errors.push('fragmentGlsl must contain void main');
  } else {
    for (const u of REQUIRED_UNIFORMS) {
      if (!d.fragmentGlsl.includes(u)) errors.push(`fragmentGlsl must declare ${u}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

// Browser-only: compiles, benchmarks over real frames, then registers.
// The optional report callback receives the measured fps (null when the
// shader never compiled) so pages can show per-shader numbers + failures.
export interface BenchReport {
  id: string;
  fps: number | null;
  error?: string;
}

export async function registerVisualizer(
  def: ShaderDefinition,
  renderer: Renderer,
  report?: (r: BenchReport) => void,
): Promise<boolean> {
  const errors = verifyVisualizer(def).errors;
  if (typeof def.id === 'string' && getShader(def.id)) {
    errors.push(`duplicate shader id: ${def.id}`);
  }
  const compiled = renderer.tryCompile(def);
  if ('error' in compiled) errors.push(`compile failed: ${compiled.error}`);
  if (errors.length > 0) {
    report?.({ id: def.id, fps: null, error: errors[0] });
    logDecision({
      step: 'verify',
      model: 'local',
      input: `register ${def.id}`,
      result: 'rejected',
      verify: { pass: false, reason: errors[0] },
      retries: 0,
      latencyMs: null,
    });
    return false;
  }

  renderer.setShader(def);
  const p = DEFAULT_VISUAL_PARAMS;
  for (let i = 0; i < 5; i++) {
    await nextFrame();
    renderer.renderVisual(performance.now() / 1000, mockFeatures(i / 60), p.palette, p.intensity, p.speed, 0, [0.5, 0.5, 0.5], 1);
  }
  const t0 = performance.now();
  for (let i = 0; i < BENCHMARK_FRAMES; i++) {
    await nextFrame();
    const t = performance.now() / 1000;
    renderer.renderVisual(t, mockFeatures(t), p.palette, p.intensity, p.speed, 0, [0.5, 0.5, 0.5], 1);
  }
  const fps = (BENCHMARK_FRAMES / Math.max(1, performance.now() - t0)) * 1000;
  report?.({ id: def.id, fps });
  if (fps < MIN_BENCHMARK_FPS) {
    logDecision({
      step: 'verify',
      model: 'local',
      input: `register ${def.id}`,
      result: `rejected at ${fps.toFixed(0)}fps`,
      verify: { pass: false, reason: `benchmark ${fps.toFixed(0)}fps below ${MIN_BENCHMARK_FPS}fps floor` },
      retries: 0,
      latencyMs: null,
    });
    return false;
  }
  registerShader(def);
  logDecision({
    step: 'verify',
    model: 'local',
    input: `register ${def.id}`,
    result: `registered (${fps.toFixed(0)}fps bench)`,
    verify: { pass: true, reason: 'compile + benchmark passed' },
    retries: 0,
    latencyMs: null,
  });
  return true;
}
