import { NextResponse } from 'next/server';

// M5: proxies one track upload to the Modal DSP endpoint. Modal is
// compute only (librosa/numpy, no AI models). Any failure — missing env,
// oversize upload, Modal error, or >30s — answers { ok:false } and the
// app continues with live analysis only.
const ANALYZE_TIMEOUT_MS = 30_000;
const ANALYZE_MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: Request) {
  const url = process.env.MODAL_ANALYZE_URL;
  const token = process.env.MODAL_ANALYZE_TOKEN;
  if (!url || !token) return NextResponse.json({ ok: false });
  let body: ArrayBuffer;
  try {
    body = await req.arrayBuffer();
  } catch {
    return NextResponse.json({ ok: false });
  }
  if (body.byteLength === 0 || body.byteLength > ANALYZE_MAX_BYTES) {
    return NextResponse.json({ ok: false });
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ANALYZE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'x-aei-token': token },
      body,
      signal: ctrl.signal,
    });
    if (!res.ok) return NextResponse.json({ ok: false });
    const map = (await res.json()) as unknown;
    return NextResponse.json({ ok: true, map });
  } catch {
    return NextResponse.json({ ok: false });
  } finally {
    clearTimeout(timer);
  }
}
