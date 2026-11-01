// Server-side Spark shader authoring: one strict-JSON chat call that
// writes engine-conformant GLSL. Mock returns the contract example with
// no network. Never imported by client code.
import type { EventTheme } from '../types';
import {
  ENGINE_SHADER_CONTRACT,
  mockEngineShader,
  type ShaderBrief,
  type ShaderFeedback,
} from '../visuals/shaderContract';
import { cached } from './cache';
import { isLive } from './config';
import { MUSE_SPARK_MODEL, chatJsonWithUsage } from './metaClient';
import { stashUsage } from './usage';

const SHADER_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: { glsl: { type: 'string' } },
  required: ['glsl'],
};

export async function generateShaderSource(
  theme: EventTheme | null,
  brief: ShaderBrief = {},
  feedback?: ShaderFeedback,
): Promise<{ glsl: string; model: string }> {
  if (typeof window !== 'undefined') throw new Error('shader authoring is server-side only');
  if (!isLive()) {
    stashUsage({
      calls: 1,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      latencyMs: 0,
      mock: true,
      status: 'mock',
    });
    return { glsl: mockEngineShader(), model: 'mock' };
  }
  const themeLine = theme
    ? `Theme: "${theme.eventName}" (${theme.genre}, ${theme.mood}, energy ${theme.energy}). ` +
      `Palette: ${theme.palette.join(', ')}. Motifs: ${theme.motifs.join(', ') || 'none'}.`
    : 'No event theme: aim for a versatile peak-time look.';
  const briefLine = brief.prompt
    ? `Request: ${brief.prompt}`
    : `Request: a ${brief.mood ?? 'electric'} visual around energy ${brief.energy ?? 0.8}.`;
  const developer =
    'You write live music-visual shaders for the PAPAGEDON engine. Reply with JSON only, ' +
    'matching the provided schema exactly: {"glsl": string}. The glsl value is the full ' +
    'fragment shader body.\n' +
    ENGINE_SHADER_CONTRACT +
    (feedback
      ? `\nThe previous attempt failed these checks: ${feedback.errors.join('; ')}. ` +
        'Fix exactly those and keep everything else working.'
      : '');
  const userText = feedback
    ? `Previous shader:\n${feedback.previous}\n\n${themeLine}\n${briefLine}`
    : `${themeLine}\n${briefLine}`;
  const cacheInput = JSON.stringify({ theme, brief, feedback: feedback?.errors ?? null });
  const glsl = await cached('shadergen', cacheInput, 3600_000, () =>
    chatJsonWithUsage<{ glsl: string }>({
      key: 'shadergen',
      messages: [
        { role: 'developer', content: developer },
        { role: 'user', content: userText },
      ],
      schemaName: 'EngineShader',
      schema: SHADER_SCHEMA,
    }).then((r) => r.data.glsl),
  );
  return { glsl, model: MUSE_SPARK_MODEL };
}
