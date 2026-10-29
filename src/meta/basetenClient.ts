// Server-side Baseten client for Muse Spark Open (open weights).
// Model: meta-models/muse-spark-open-1026. LIVE mode only.
import { basetenApiKey, isLive, MUSE_SPARK_OPEN_MODEL_ID } from './config';
import { acquire } from './rateLimiter';

export async function basetenCall<T>(input: unknown): Promise<T> {
  if (typeof window !== 'undefined') throw new Error('basetenClient is server-side only');
  if (!isLive()) throw new Error('basetenCall requires AEI_LIVE=true');
  const key = basetenApiKey();
  if (!key) throw new Error('BASETEN_API_KEY is not set');
  await acquire('baseten:muse-spark-open');
  // TODO(M5): confirm the invoke URL shape against the Baseten model page.
  const res = await fetch('https://api.baseten.co/v1/model_invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Api-Key ${key}` },
    body: JSON.stringify({ model: MUSE_SPARK_OPEN_MODEL_ID, input }),
  });
  if (!res.ok) throw new Error(`Baseten call failed: ${res.status}`);
  return (await res.json()) as T;
}
