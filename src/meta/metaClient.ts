// Server-side Meta Model API client. The single place where Muse Spark,
// Muse Wonder, Muse Image, Muse Voice Transcribe and SAM 3.1 calls happen
// (LIVE mode only). Never imported by client code.
import { isLive, metaApiKey } from './config';
import { acquire } from './rateLimiter';

// TODO(M2): confirm the real base URL + paths against the hackathon docs.
const META_API_BASE = process.env.META_API_BASE ?? 'https://meta-model-api.example/v1';

function assertServer() {
  if (typeof window !== 'undefined') throw new Error('metaClient is server-side only');
}

export async function metaCall<T>(path: string, body: unknown): Promise<T> {
  assertServer();
  if (!isLive()) throw new Error('metaCall requires AEI_LIVE=true');
  const key = metaApiKey();
  if (!key) throw new Error('META_API_KEY is not set');
  await acquire(`meta:${path}`);
  const res = await fetch(`${META_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Meta API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}
