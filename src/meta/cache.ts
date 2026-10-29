// Response cache keyed by input hash. Every model response is cached (cost rule).
const store = new Map<string, { value: unknown; expires: number }>();

export function hashInput(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit || hit.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs = 3600_000): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export async function cached<T>(
  namespace: string,
  input: string,
  ttlMs: number,
  run: () => Promise<T>,
): Promise<T> {
  const key = `${namespace}:${hashInput(input)}`;
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await run();
  cacheSet(key, value, ttlMs);
  return value;
}
