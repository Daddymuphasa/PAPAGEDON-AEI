// M2 apply flow: extract -> plain verify -> judge -> retry (max 3) -> apply.
// Verification is baked in: a theme only comes out of here verified.
// Fully async; the render loop never waits on it.
import type { EventTheme } from '../../types';
import { listShaders } from '../../../shaders/registry';
import { logDecision } from '../../director/decisionLog';
import { requestJudge, requestTheme } from './flyer';
import { MAX_RETRIES, verifyThemePlain } from './verifyTheme';

export interface VerifiedTheme {
  ok: boolean;
  theme: EventTheme | null;
  errors: string[];
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function extractVerifiedTheme(flyerDataUrl: string): Promise<VerifiedTheme> {
  const availableIds = listShaders().map((s) => s.id);
  const sizeKb = Math.max(1, Math.round(flyerDataUrl.length / 1024));
  let feedback: { previousTheme: EventTheme; errors: string[] } | undefined;
  let lastErrors = ['not attempted'];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    logDecision({
      step: 'plan',
      model: 'local',
      input: attempt === 0 ? `extract theme from flyer (${sizeKb}KB)` : `retry ${attempt}/${MAX_RETRIES}`,
      result: attempt === 0 ? 'extract then verify' : `fix: ${lastErrors[0]}`,
      verify: null,
      retries: attempt,
      latencyMs: null,
    });

    let theme: EventTheme;
    let extractModel = '?';
    const t0 = performance.now();
    try {
      const res = await requestTheme(flyerDataUrl, feedback);
      theme = res.theme;
      extractModel = res.model;
    } catch (err) {
      lastErrors = [`extract failed: ${errMessage(err)}`];
      logDecision({
        step: 'observe',
        model: 'local',
        input: 'extract call',
        result: lastErrors[0],
        verify: { pass: false, reason: lastErrors[0] },
        retries: attempt,
        latencyMs: Math.round(performance.now() - t0),
      });
      continue;
    }
    const extractMs = Math.round(performance.now() - t0);
    logDecision({
      step: 'act',
      model: extractModel,
      input: `flyer (${sizeKb}KB)`,
      result: `"${theme.eventName}" (${theme.genre}, ${theme.mood})`,
      verify: null,
      retries: attempt,
      latencyMs: extractMs,
    });

    const plain = verifyThemePlain(theme, availableIds);
    logDecision({
      step: 'verify',
      model: 'local',
      input: 'plain checks: hex, shader ids, tempo, timing, fields',
      result: plain.ok ? 'all plain checks passed' : `${plain.errors.length} error(s)`,
      verify: plain.ok ? { pass: true, reason: 'well-formed theme' } : { pass: false, reason: plain.errors[0] },
      retries: attempt,
      latencyMs: null,
    });
    if (!plain.ok) {
      lastErrors = plain.errors;
      feedback = { previousTheme: theme, errors: plain.errors };
      continue;
    }

    const j0 = performance.now();
    try {
      const { verdict, model } = await requestJudge(flyerDataUrl, theme);
      logDecision({
        step: 'verify',
        model,
        input: 'judge: theme vs flyer',
        result: verdict.pass ? 'PASS' : 'FAIL',
        verify: { pass: verdict.pass, reason: verdict.reason },
        retries: attempt,
        latencyMs: Math.round(performance.now() - j0),
      });
      if (!verdict.pass) {
        lastErrors = [verdict.reason];
        feedback = { previousTheme: theme, errors: lastErrors };
        continue;
      }
    } catch (err) {
      lastErrors = [`judge failed: ${errMessage(err)}`];
      logDecision({
        step: 'observe',
        model: 'local',
        input: 'judge call',
        result: lastErrors[0],
        verify: { pass: false, reason: lastErrors[0] },
        retries: attempt,
        latencyMs: Math.round(performance.now() - j0),
      });
      continue;
    }

    logDecision({
      step: 'observe',
      model: 'local',
      input: 'verified theme ready',
      result: `"${theme.eventName}" passed plain + judge checks`,
      verify: { pass: true, reason: 'verified' },
      retries: attempt,
      latencyMs: null,
    });
    return { ok: true, theme, errors: [] };
  }

  logDecision({
    step: 'observe',
    model: 'local',
    input: `gave up after ${MAX_RETRIES} retries`,
    result: `keeping last good theme (${lastErrors[0]})`,
    verify: { pass: false, reason: lastErrors[0] },
    retries: MAX_RETRIES,
    latencyMs: null,
  });
  return { ok: false, theme: null, errors: lastErrors };
}
