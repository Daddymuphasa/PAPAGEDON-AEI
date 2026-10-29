// Minimal per-key rate limiter: min interval between calls + burst cap per minute.
const lastAt = new Map<string, number>();
const hits: number[] = [];

export async function acquire(key: string, minIntervalMs = 2000, maxPerMinute = 20): Promise<void> {
  const now = Date.now();
  while (hits.length && hits[0] < now - 60_000) hits.shift();
  if (hits.length >= maxPerMinute) {
    await new Promise((r) => setTimeout(r, now - hits[0] + 60_000));
    return acquire(key, minIntervalMs, maxPerMinute);
  }
  const last = lastAt.get(key) ?? 0;
  const wait = last + minIntervalMs - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastAt.set(key, Date.now());
  hits.push(Date.now());
}
