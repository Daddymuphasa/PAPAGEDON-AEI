// Client-side GLSL generation flow: request -> static scan ->
// browser compile check -> retry once with the errors -> null (the page
// keeps its last good visual). Every step logs to the decision log.
import type { EventTheme, ModelUsage } from '../types';
import { withBasePath } from '../basePath';
import { getCredits, isCapped, recordUsage } from '../director/credit';
import { logDecision } from '../director/decisionLog';
import { PapagedonRenderer } from '../lib/papagedon/renderer';
import { scanShaderSource, type ShaderBrief, type ShaderFeedback } from './shaderContract';

export function shaderBlockReason(): string | null {
  const s = getCredits();
  if (!isCapped(s)) return null;
  if (s.calls >= s.callCap) return `call cap reached (${s.calls}/${s.callCap})`;
  return `token cap reached (${s.inputTokens + s.outputTokens + s.reasoningTokens}/${s.tokenCap})`;
}

function parseUsage(res: Response): ModelUsage {
  try {
    const raw = res.headers.get('x-aei-usage');
    if (raw) return JSON.parse(raw) as ModelUsage;
  } catch {
    /* fall through */
  }
  return { calls: 1, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, latencyMs: 0, mock: false, status: 'unknown' };
}

export interface ShaderResponse {
  glsl: string;
  model: string;
}

export async function requestShader(
  theme: EventTheme | null,
  brief: ShaderBrief,
  feedback?: ShaderFeedback,
): Promise<ShaderResponse> {
  const blocked = shaderBlockReason();
  if (blocked) throw new Error(`shader generation blocked: ${blocked}`);
  const res = await fetch(withBasePath('/api/visuals/shader'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, brief, feedback }),
  });
  recordUsage(parseUsage(res));
  if (!res.ok) throw new Error(`shader request failed: ${res.status}`);
  const data = (await res.json()) as { glsl?: unknown };
  if (typeof data.glsl !== 'string' || !data.glsl) throw new Error('shader request returned no GLSL');
  return { glsl: data.glsl, model: res.headers.get('x-aei-model') ?? '?' };
}

let scratch: PapagedonRenderer | null = null;

function scratchRenderer(): PapagedonRenderer | null {
  try {
    if (!scratch) {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 4;
      scratch = PapagedonRenderer.create(canvas);
    }
    return scratch;
  } catch {
    return null;
  }
}

export interface SettledShader {
  glsl: string;
  model: string;
}

export async function generateEngineShader(
  theme: EventTheme | null,
  brief: ShaderBrief,
): Promise<SettledShader | null> {
  const blocked = shaderBlockReason();
  if (blocked) {
    logDecision({
      step: 'cap',
      model: 'local',
      input: 'shader generation trigger',
      result: `blocked: ${blocked}`,
      verify: null,
      retries: 0,
      latencyMs: null,
    });
    return null;
  }
  logDecision({
    step: 'plan',
    model: 'local',
    input: `new visual (${brief.prompt ?? brief.mood ?? 'free brief'})`,
    result: 'requesting GLSL from Spark',
    verify: null,
    retries: 0,
    latencyMs: null,
  });
  let feedback: ShaderFeedback | undefined;
  for (let attempt = 0; attempt <= 1; attempt++) {
    let res: ShaderResponse;
    try {
      res = await requestShader(theme, brief, feedback);
    } catch (err) {
      logDecision({
        step: 'observe',
        model: 'local',
        input: 'shader request',
        result: err instanceof Error ? err.message : String(err),
        verify: { pass: false, reason: 'request failed' },
        retries: attempt,
        latencyMs: null,
      });
      return null;
    }
    const scan = scanShaderSource(res.glsl);
    const r = scratchRenderer();
    const compiled = r ? r.useFragment(res.glsl) : { ok: false as const, error: 'no WebGL2 for the compile check' };
    const errors = [...scan.errors, ...(compiled.ok ? [] : [`compile: ${compiled.error.split('\n')[0]}`])];
    logDecision({
      step: 'verify',
      model: res.model,
      input: `generated GLSL (${res.glsl.length} chars)`,
      result: errors.length === 0 ? 'PASS: static scan + browser compile' : `FAIL: ${errors[0]}`,
      verify: errors.length === 0 ? { pass: true, reason: 'stage-ready' } : { pass: false, reason: errors[0] },
      retries: attempt,
      latencyMs: null,
    });
    if (errors.length === 0) {
      logDecision({
        step: 'act',
        model: res.model,
        input: 'verified shader',
        result: 'applied to the stage',
        verify: null,
        retries: attempt,
        latencyMs: null,
      });
      return { glsl: res.glsl, model: res.model };
    }
    feedback = { previous: res.glsl, errors };
  }
  logDecision({
    step: 'act',
    model: 'local',
    input: 'shader retry exhausted',
    result: 'keeping the last good visual',
    verify: { pass: false, reason: 'retry gave up' },
    retries: 1,
    latencyMs: null,
  });
  return null;
}
