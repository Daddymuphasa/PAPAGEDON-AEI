// All Meta model entry points. MOCK by default; LIVE calls go through the
// server-side clients with cache + rate limiter. Server-side only.
import type { EventTheme, PlannerInput, ShowPlan, ThemeVerdict } from '../types';
import { CATALOG_IDS } from '../../shaders/catalog';
import { verifyThemePlain } from '../inputs/flyer/verifyTheme';
import { cached } from './cache';
import { isLive } from './config';
import { chatJson, chatJsonWithUsage } from './metaClient';
import { mockShowPlan, mockTheme } from './mock';
import { coerceRoles, deriveRoles, hexToHsl, hueDistance } from '../theme/roles';

function assertServer() {
  if (typeof window !== 'undefined') throw new Error('meta stubs are server-side only');
}

function availableShaderIds(): string[] {
  return [...CATALOG_IDS];
}

const THEME_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    eventName: { type: 'string' },
    genre: { type: 'string' },
    mood: { type: 'string' },
    palette: { type: 'array', items: { type: 'string' } },
    roles: {
      type: 'object',
      additionalProperties: false,
      properties: {
        background: { type: 'string' },
        primary: { type: 'string' },
        secondary: { type: 'string' },
        accent: { type: 'string' },
        highlight: { type: 'string' },
      },
      required: ['background', 'primary', 'secondary', 'accent', 'highlight'],
    },
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
export async function extractTheme(
  flyerDataUrl: string,
  feedback?: ExtractFeedback,
  availableIds?: string[],
): Promise<EventTheme> {
  assertServer();
  if (!isLive()) return mockTheme;
  const cacheInput = feedback ? flyerDataUrl + JSON.stringify(feedback) : flyerDataUrl;
  const theme = await cached('theme', cacheInput, 24 * 3600_000, () => {
    const ids = (availableIds && availableIds.length > 0 ? availableIds : availableShaderIds()).join(', ');
    const developer =
      'You extract a visual theme from an event flyer for a real-time music visualizer. ' +
      'Reply with JSON only, matching the provided schema exactly: eventName, genre, mood, ' +
      'palette (3-6 hex colours like "#ff2d78": the flyer\'s key graphic inks, most ' +
      'characteristic first — never lead with the flat background black/white), energy 0-1, ' +
      'motifs (up to 8 short tags), typographyFeel, tempoBpm {min,max} ' +
      '(plausible BPM range for the genre), sceneSwitchSeconds {min,max} ' +
      '(how often visuals should cut, 2-30s), roles {background, primary, secondary, ' +
      'accent, highlight} (5 hex: background = darkest tone for the wall; primary = the ' +
      'flyer\'s most characteristic saturated ink, never near-black/near-white; ' +
      'secondary/accent = next most distinct hues; highlight = brightest spark colour), ' +
      'suggestedShaderIds (6-12 ids, ONLY from this list: ' +
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
  // Same shape as mock, even for old cached themes without roles.
  theme.roles = coerceRoles(theme.palette, theme.roles);
  return theme;
}

// M2: judge check — does the theme actually match the flyer?
export async function judgeTheme(
  flyerDataUrl: string,
  theme: EventTheme,
  availableIds?: string[],
  samplePalette?: string[],
): Promise<ThemeVerdict> {
  assertServer();
  if (!isLive()) {
    const ids = availableIds && availableIds.length > 0 ? availableIds : availableShaderIds();
    const check = verifyThemePlain(theme, ids);
    if (!check.ok) return { pass: false, reason: check.errors[0] };
    // Visible check: the theme's primary must sit near the flyer's own.
    if (samplePalette && samplePalette.length >= 3) {
      const want = deriveRoles(samplePalette).primary;
      const got = coerceRoles(theme.palette, theme.roles).primary;
      const drift = hueDistance(hexToHsl(want)[0], hexToHsl(got)[0]);
      if (drift > 0.12) {
        return { pass: false, reason: `theme primary ${got} does not match flyer primary ${want}` };
      }
    }
    return { pass: true, reason: 'theme matches the flyer (mock judge)' };
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

// Retired in Phase 1: the legacy M1/M4/M5 stubs (transcribeChunk,
// analyzeMusic, segmentCrowd, planScene) died with the old home-page flow.
// The show runs on extractTheme/judgeTheme/planShow only.

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
      'intensity 0-1, speed 0-2, paletteEmphasis (integer 0-3: a colour-variation index — ' +
      'the primary colour always stays fixed while secondary/accent shift), transition {crossfade|cut|flash-cut, ' +
      'durationMs 0-2000}, energyArc {build|peak|sustain|breakdown|release}, sectionSeconds 10-60, ' +
      'reason (one plain-English line). Never pick the current scene visualId or the last plan visualId; ' +
      'always use transition type crossfade with durationMs 1500; ' +
      'match the arc — drops hit hard, breakdowns breathe.' +
      ' Visualizers tagged 3d-signature are the peak-moment weapons: strongly prefer them on drops and peak sections.' +
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
