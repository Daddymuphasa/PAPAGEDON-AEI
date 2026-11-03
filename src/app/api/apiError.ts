// Shared API error mapping: turn server throws into precise, key-safe JSON
// errors so the client can tell "no key set" from "key rejected" from
// "Meta failed". Never leaks keys, statuses, or SDK internals.
import { NextResponse } from 'next/server';

export function apiError(err: unknown): NextResponse {
  const msg = err instanceof Error ? err.message : String(err);
  if (/not set/i.test(msg)) {
    return NextResponse.json({ error: 'server-key-missing' }, { status: 503 });
  }
  if (/401|403|unauthorized|forbidden|invalid.?api.?key|authentication|api key/i.test(msg)) {
    return NextResponse.json({ error: 'key-rejected' }, { status: 502 });
  }
  if (/timed?\s?out|abort/i.test(msg)) {
    return NextResponse.json({ error: 'meta-timeout' }, { status: 504 });
  }
  return NextResponse.json({ error: 'meta-error' }, { status: 502 });
}
