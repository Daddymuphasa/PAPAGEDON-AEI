// All Meta model entry points. MOCK by default; LIVE calls go through the
// server-side clients with cache + rate limiter. Server-side only.
import type {
  CrowdSignal,
  DirectorInput,
  EventTheme,
  MusicInsight,
  PlannerInput,
  ScenePlan,
  ShowPlan,
  ThemeVerdict,
} from '../types';
import { listShaders } from '../../shaders/registry';
import { verifyThemePlain } from '../inputs/flyer/verifyTheme';
import { cached } from './cache';
import { directorProvider, isLive } from './config';
import { chatJson, chatJsonWithUsage, metaCall } from './metaClient';
import { basetenCall } from './basetenClient';
import { mockCrowdSignal, mockInsight, mockPlan, mockShowPlan, mockTheme } from './mock';

function assertServer() {
  if (typeof window !== 'undefined') throw new Error('meta stubs are server-side only');
}

function availableShaderIds(): string[] {
  return listShaders().map((s) => s.id);
}

const THEME_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    eventName: { type: 'string' },
    genre: { type: 'string' },
    mood: { type: 'string' },
    palette: { type: 'array', items: { type: 'string' } },
    energy: { type: 'number' },
    motifs: { type: 'array', items: { type: 'string' } },
    typographyFeel: { type: 'string' },
    tempoBpm: {
      type: 'object',
      additionalProperties: false,
      properties: { min: { type: 'number' }, max: { type: 'number' } },
      required: ['min', 'max'],
    },
    sceneSwitchSeconds: {
      type: 'object',
      additionalProperties: false,
      properties: { min: { type: 'number' }, max: { type: 'number' } },
      required: ['min', 'max'],
    },
    suggestedShaderIds: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'eventName',
    'genre',
    'mood',
    'palette',
    'energy',
    'motifs',
    'typographyFeel',
    'tempoBpm',
    'sceneSwitchSeconds',
    'suggestedShaderIds',
  ],
};

const VERDICT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: { pass: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['pass', 'reason'],
};

export interface ExtractFeedback {
  previousTheme: EventTheme;
  errors: string[];
}

// M2: flyer -> EventTheme via Muse Spark (vision). Once per event.
// Optional feedback retries a failed theme with the verify errors attached.
export async function extractTheme(flyerDataUrl: string, feedback?: ExtractFeedback): Promise<EventTheme> {
  assertServer();
  if (!isLive()) return mockTheme;
  const cacheInput = feedback ? flyerDataUrl + JSON.stringify(feedback) : flyerDataUrl;
  return cached('theme', cacheInput, 24 * 3600_000, () => {
    const ids = availableShaderIds().join(', ');
    const developer =
      'You extract a visual theme from an event flyer for a real-time music visualizer. ' +
      'Reply with JSON only, matching the provided schema exactly: eventName, genre, mood, ' +
      'palette (3-6 hex colours like "#ff2d78", dominant first), energy 0-1, ' +
      'motifs (up to 8 short tags), typographyFeel, tempoBpm {min,max} ' +
      '(plausible BPM range for the genre), sceneSwitchSeconds {min,max} ' +
      '(how often visuals should cut, 2-30s), suggestedShaderIds (1 or more ids, ONLY from this list: ' +
      `${ids}).` +
      (feedback ? ` Fix exactly these errors in the previous theme and keep everything else: ${feedback.errors.join('; ')}.` : '');
    const userText = feedback
      ? `Previous theme: ${JSON.stringify(feedback.previousTheme)}\nFix the listed errors for this flyer.`
      : 'Extract the visual theme from this event flyer.';
    return chatJson<EventTheme>({
      key: 'theme',
      messages: [
        { role: 'developer', content: developer },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: flyerDataUrl } },
          ],
        },
      ],
      schemaName: 'EventTheme',
      schema: THEME_SCHEMA,
    });
  });
}

// M2: judge check — does the theme actually match the flyer?
export async function judgeTheme(flyerDataUrl: string, theme: EventTheme): Promise<ThemeVerdict> {
  assertServer();
  if (!isLive()) {
    const check = verifyThemePlain(theme, availableShaderIds());
    return check.ok
      ? { pass: true, reason: 'theme is well-formed (mock judge)' }
      : { pass: false, reason: check.errors[0] };
  }
  return cached('judge', flyerDataUrl + JSON.stringify(theme), 3600_000, () =>
    chatJson<ThemeVerdict>({
      key: 'judge',
      messages: [
        {
          role: 'developer',
          content:
            'You judge whether a visual theme truly matches an event flyer. Reply with JSON only: ' +
            '{"pass": boolean, "reason": short string}. Pass only if the palette, mood, genre and energy ' +
            'plausibly describe THIS flyer. Fail mismatches, generic themes that ignore the flyer, or unreadable input.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Theme to judge: ${JSON.stringify(theme)}` },
            { type: 'image_url', image_url: { url: flyerDataUrl } },
          ],
        },
      ],
      schemaName: 'ThemeVerdict',
      schema: VERDICT_SCHEMA,
    }),
  );
}

// M4: rolling 10-30s chunk -> lyrics/keywords via Muse Voice Transcribe.
export async function transcribeChunk(chunkRef: string): Promise<{ lyrics: string; keywords: string[] }> {
  assertServer();
  if (!isLive()) return { lyrics: '', keywords: mockInsight.keywords };
  return cached('transcribe', chunkRef, 3600_000, () =>
    metaCall<{ lyrics: string; keywords: string[] }>('/muse-voice/transcribe', { chunk: chunkRef }),
  );
}

// M4: chunk summary -> genre/section/mood via Muse Spark.
export async function analyzeMusic(summary: string): Promise<MusicInsight> {
  assertServer();
  if (!isLive()) return mockInsight;
  return cached('analyze', summary, 600_000, () =>
    metaCall<MusicInsight>('/muse-spark/analyze', { summary }),
  );
}

// M5: throttled camera frame -> density/movement via SAM 3.1.
export async function segmentCrowd(frameRef: string): Promise<CrowdSignal> {
  assertServer();
  if (!isLive()) return mockCrowdSignal;
  return cached('crowd', frameRef, 60_000, () =>
    metaCall<CrowdSignal>('/sam-3.1/segment', { frame: frameRef }),
  );
}

// M5: director reasoning. Provider switchable by config: Muse Spark
// (Meta Model API) or Muse Spark Open (Baseten open weights).
export async function planScene(input: DirectorInput): Promise<ScenePlan> {
  assertServer();
  if (!isLive()) return mockPlan(input);
  const key = JSON.stringify({
    t: input.theme,
    s: input.insight?.section,
    g: input.insight?.genre,
    d: input.crowd?.density,
  });
  if (directorProvider() === 'muse-spark-open') {
    return cached('plan-open', key, 30_000, () =>
      basetenCall<ScenePlan>({ prompt: 'Plan the next scene.', input }),
    );
  }
  return cached('plan', key, 30_000, () => metaCall<ScenePlan>('/muse-spark/direct', { input }));
}

const SHOWPLAN_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    visualId: { type: 'string' },
    params: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
    intensity: { type: 'number' },
    speed: { type: 'number' },
    paletteEmphasis: { type: 'integer' },
    transition: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['crossfade', 'cut', 'flash-cut'] },
        durationMs: { type: 'number' },
      },
      required: ['type', 'durationMs'],
    },
    energyArc: {
      type: 'string',
      enum: ['build', 'peak', 'sustain', 'breakdown', 'release'],
    },
    sectionSeconds: { type: 'number' },
    reason: { type: 'string' },
    texture: { type: ['string', 'null'] },
    texMix: { type: 'number' },
  },
  required: [
    'visualId',
    'params',
    'intensity',
    'speed',
    'paletteEmphasis',
    'transition',
    'energyArc',
    'sectionSeconds',
    'reason',
  ],
};

export interface PlanFeedback {
  previous: ShowPlan;
  errors: string[];
}

let showCursor = 0;

// M4: the slow creative layer. One plan per call; the client verifies and
// retries with feedback. Mock rotates varied realistic plans (no keys).
export async function planShow(input: PlannerInput, feedback?: PlanFeedback): Promise<ShowPlan> {
  assertServer();
  if (!isLive()) return mockShowPlan(input, showCursor++);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const cacheInput = JSON.stringify({
    v: input.current.visualId,
    e: input.summary.events,
    a: r1(input.summary.avgEnergy),
    g: input.theme?.genre ?? '',
    f: feedback ? feedback.errors : null,
    // M5: only present with a track map, so keys are unchanged otherwise.
    ...(input.upcomingSections && input.upcomingSections.length > 0 ? { u: input.upcomingSections } : {}),
    // M6: only present once the room has been profiled.
    ...(input.profile ? { p: [input.profile.label, input.profile.bpm] } : {}),
    // M7: only present once event images exist.
    ...(input.textures && input.textures.length > 0
      ? { x: input.textures.filter((t) => t.enabled).map((t) => t.id) }
      : {}),
    // M8: only present while the camera reads the stage.
    ...(input.vision ? { s: [input.vision.present ? 1 : 0, r1(input.vision.coverage), r1(input.vision.motion)] } : {}),
  });
  return cached('showplan', cacheInput, 120_000, () => {
    const enabledTextures = (input.textures ?? []).filter((t) => t.enabled);
    const developer =
      'You direct a live music visual show. Given the theme, the last-20s audio summary, ' +
      'current scene and the last 3 plans, pick the next scene as strict JSON: visualId (only from ' +
      'the provided visualizer list), params (3 numbers, each inside its declared min-max range), ' +
      'intensity 0-1, speed 0-2, paletteEmphasis (integer 0-3), transition {crossfade|cut|flash-cut, ' +
      'durationMs 0-2000}, energyArc {build|peak|sustain|breakdown|release}, sectionSeconds 10-60, ' +
      'reason (one plain-English line). Never repeat the current visual more than twice in a row; ' +
      'match the arc — drops hit hard, breakdowns breathe.' +
      (input.upcomingSections && input.upcomingSections.length > 0
        ? ' The show state lists upcoming mapped sections — anticipate them: ease in before a drop, hit on it.'
        : '') +
      (input.profile
        ? ' The show state carries a local listening profile — fit the plan to it (match the sound, not a generic look).'
        : '') +
      (enabledTextures.length > 0
        ? ` Event image textures are available (${enabledTextures
            .map((t) => `${t.id}: ${t.energyTag}`)
            .join(', ')}): include "texture" (one of these ids, or null to auto-match the section energy) ` +
          'and "texMix" 0-1 (how strongly the artwork blends over the shader; higher on drops, lower when the shader should lead).'
        : '') +
      (input.vision
        ? ' The camera reads the stage (vision.present/coverage/motion in the show state): when a performer is present, frame them with performer-favoring scenes; let crowd motion lift intensity, and calm down when the crowd stills.'
        : '') +
      (input.visualizers.some((v) => v.meta !== undefined)
        ? ' Each visualizer carries meta (themeTags, an energyRange sweet spot, moods): prefer scenes whose energyRange contains the current energy and whose tags/moods match the theme genre/mood/motifs; save out-of-range scenes for matching moments.'
        : '') +
      (feedback
        ? ` Fix exactly these errors in the previous plan and keep everything else: ${feedback.errors.join('; ')}.`
        : '');
    const userText = feedback
      ? `Previous plan: ${JSON.stringify(feedback.previous)}\nShow state: ${JSON.stringify(input)}`
      : `Show state: ${JSON.stringify(input)}`;
    return chatJsonWithUsage<ShowPlan>({
      key: 'showplan',
      messages: [
        { role: 'developer', content: developer },
        { role: 'user', content: userText },
      ],
      schemaName: 'ShowPlan',
      schema: SHOWPLAN_SCHEMA,
    }).then((r) => r.data);
  });
}
