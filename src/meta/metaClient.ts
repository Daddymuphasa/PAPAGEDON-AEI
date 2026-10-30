// Server-side Meta Model API client. The single place where Muse Spark,
// Muse Wonder, Muse Image, Muse Voice Transcribe and SAM 3.1 calls happen
// (LIVE mode only). Never imported by client code.
import OpenAI from 'openai';
import type { ModelUsage } from '../types';
import { isLive, metaApiKey } from './config';
import { acquire } from './rateLimiter';
import { stashUsage } from './usage';

export const META_API_BASE = 'https://api.meta.ai/v1';
export const MUSE_SPARK_MODEL = 'muse-spark-1.3';

function assertServer() {
  if (typeof window !== 'undefined') throw new Error('metaClient is server-side only');
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  assertServer();
  if (!client) {
    const key = metaApiKey();
    if (!key) throw new Error('MODEL_API_KEY (or META_API_KEY fallback) is not set');
    client = new OpenAI({ baseURL: META_API_BASE, apiKey: key });
  }
  return client;
}

type ChatMessages = Parameters<OpenAI['chat']['completions']['create']>[0]['messages'];

// Strict-JSON chat call. Only model + messages + response_format are set:
// the docs leave temperature/top_p at defaults and mark stop, logprobs,
// frequency/presence penalties and reasoning_effort "none" unsupported.
export async function chatJson<T>(args: {
  key: string;
  messages: ChatMessages;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  return (await chatJsonWithUsage<T>(args)).data;
}

// M4: same call, plus token usage for the credit guard.
export async function chatJsonWithUsage<T>(args: {
  key: string;
  messages: ChatMessages;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<{ data: T; usage: ModelUsage }> {
  assertServer();
  if (!isLive()) throw new Error('chatJson requires AEI_LIVE=true');
  await acquire(`meta:${args.key}`);
  const t0 = Date.now();
  const res = await getClient().chat.completions.create({
    model: MUSE_SPARK_MODEL,
    messages: args.messages,
    response_format: {
      type: 'json_schema',
      json_schema: { name: args.schemaName, schema: args.schema },
    },
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error('empty model response');
  const u = res.usage;
  const details = u?.completion_tokens_details as { reasoning_tokens?: unknown } | undefined;
  const usage: ModelUsage = {
    calls: 1,
    inputTokens: u?.prompt_tokens ?? 0,
    outputTokens: u?.completion_tokens ?? 0,
    reasoningTokens: typeof details?.reasoning_tokens === 'number' ? details.reasoning_tokens : 0,
    latencyMs: Date.now() - t0,
    mock: false,
    status: 'ok',
  };
  stashUsage(usage);
  return { data: JSON.parse(text) as T, usage };
}

export async function metaCall<T>(path: string, body: unknown): Promise<T> {
  assertServer();
  if (!isLive()) throw new Error('metaCall requires AEI_LIVE=true');
  const key = metaApiKey();
  if (!key) throw new Error('MODEL_API_KEY (or META_API_KEY fallback) is not set');
  await acquire(`meta:${path}`);
  const res = await fetch(`${META_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Meta API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}
