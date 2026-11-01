// M2 apply flow: extract -> plain verify -> judge -> retry (max 3) -> apply.
// Verification is baked in: a theme only comes out of here verified.
// Fully async; the render loop never waits on it.
import type { EventTheme } from '../../types';
import { CATALOG, CATALOG_IDS } from '../../../shaders/catalog';
import { logDecision } from '../../director/decisionLog';
import { requestJudge, requestTheme } from './flyer';
import { enhanceMockTheme, sampleFlyer, type FlyerSample } from './samplePalette';
import { MAX_RETRIES, verifyThemePlain } from './verifyTheme';

export interface VerifiedTheme {
  ok: boolean;
  theme: EventTheme | null;
  errors: string[];
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Mock mode has no vision model, so read the flyer here: real palette,
// energy and motifs from the pixels, shader ids matched to the catalog.
async function enhanceFromFlyer(
  flyerDataUrl: string,
  base: EventTheme,
  fileName?: string,
): Promise<{ theme: EventTheme; samplePalette: string[] }> {
  let sample: FlyerSample;
  try {
    sample = await sampleFlyer(flyerDataUrl);
  } catch {
    const p = base.palette;
    const first = p[0] ?? '#888888';
    const palette = [0, 1, 2, 3, 4, 5].map((i) => p[i] ?? first);
    sample = {
      palette,
      weights: palette.map(() => 1 / palette.length),
      energy: base.energy,
      motifs: base.motifs.slice(0, 4),
    };
  }
  return {
    theme: enhanceMockTheme(base, sample, CATALOG, { fileName }),
    samplePalette: [...sample.palette],
  };
}

export async function extractVerifiedTheme(flyerDataUrl: string, opts?: { fileName?: string }): Promise<VerifiedTheme> {
  const availableIds = [...CATALOG_IDS];
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
    let samplePalette: string[] | undefined;
    const t0 = performance.now();
    try {
      const res = await requestTheme(flyerDataUrl, feedback, availableIds);
      theme = res.theme;
      extractModel = res.model;
      if (extractModel === 'mock') {
        const enhanced = await enhanceFromFlyer(flyerDataUrl, theme, opts?.fileName);
        theme = enhanced.theme;
        samplePalette = enhanced.samplePalette;
      }
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
      const { verdict, model } = await requestJudge(flyerDataUrl, theme, availableIds, samplePalette);
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
