// npm run check:meta — verifies Meta API access with three tiny calls.
// Reads the key from .env.local (never prints it) and reports OK/FAIL +
// HTTP status per call. Exits 0 only when all three pass.
// Plain erasable TS so `node scripts/check-meta.ts` runs it directly.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://api.meta.ai/v1';
const TIMEOUT_MS = 25_000;
const TEST_IMAGE = 'https://picsum.photos/seed/aei/64';

interface CheckResult {
  ok: boolean;
  status: string;
}

function loadKey(): { key: string; from: string } {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const path = join(root, '.env.local');
  if (!existsSync(path)) return { key: '', from: '.env.local (missing)' };
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  if (vars.MODEL_API_KEY) return { key: vars.MODEL_API_KEY, from: 'MODEL_API_KEY in .env.local' };
  if (vars.META_API_KEY) return { key: vars.META_API_KEY, from: 'META_API_KEY in .env.local' };
  return { key: '', from: '.env.local (no key)' };
}

async function post(path: string, key: string, body: unknown): Promise<CheckResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return { ok: res.ok, status: String(res.status) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: msg.includes('abort') ? 'timeout' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

function line(label: string, r: CheckResult): string {
  return `${label} ${r.ok ? 'OK' : 'FAIL'} (${r.status})`;
}

async function main(): Promise<void> {
  const { key, from } = loadKey();
  console.log(`meta access check — key: ${from}`);
  if (!key) {
    console.log('a) muse-spark-1.3 chat ... FAIL (no key)');
    console.log('b) muse-image-1.0 images . FAIL (no key)');
    console.log('c) sam-3.1 responses ..... FAIL (no key)');
    process.exit(1);
  }
  const a = await post('/chat/completions', key, {
    model: 'muse-spark-1.3',
    messages: [{ role: 'user', content: 'Reply with the single word OK.' }],
  });
  console.log(line('a) muse-spark-1.3 chat ...', a));
  const b = await post('/images/generations', key, {
    model: 'muse-image-1.0',
    prompt: 'tiny abstract gradient thumbnail, no text',
    n: 1,
  });
  console.log(line('b) muse-image-1.0 images .', b));
  // M8: exact sam.ts request shape. HTTP 200 is OK even with empty
  // output_text — zero matches is a valid result, not an error.
  const c = await post('/responses', key, {
    model: 'sam-3.1',
    input: [
      {
        type: 'message',
        role: 'user',
        content: [
          { type: 'input_text', text: 'person' },
          { type: 'input_image', image_url: TEST_IMAGE },
        ],
      },
    ],
  });
  console.log(line('c) sam-3.1 responses .....', c));
  process.exit(a.ok && b.ok && c.ok ? 0 : 1);
}

void main();
