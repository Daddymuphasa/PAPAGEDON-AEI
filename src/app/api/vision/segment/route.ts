import { NextResponse } from 'next/server';
import { SAM_MODEL, segmentFrame } from '../../../../meta/sam';
import { isLive } from '../../../../meta/config';
import { mockUsage, takeLastUsage } from '../../../../meta/usage';

// M8: camera frame -> performer/crowd boxes + low-res masks + counts.
// The key stays server-side; usage counts every SAM call for the guard.
export async function POST(req: Request) {
  const { frame, width, height } = (await req.json()) as {
    frame?: unknown;
    width?: unknown;
    height?: unknown;
  };
  if (typeof frame !== 'string' || !frame.startsWith('data:image/')) {
    return NextResponse.json({ error: 'frame data URL is required' }, { status: 400 });
  }
  const w = typeof width === 'number' ? width : NaN;
  const h = typeof height === 'number' ? height : NaN;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 16 || h < 16 || w > 4096 || h > 4096) {
    return NextResponse.json({ error: 'frame width/height must be sane integers' }, { status: 400 });
  }
  try {
    const result = await segmentFrame({ dataUrl: frame, width: w, height: h });
    const res = NextResponse.json(result);
    res.headers.set('x-aei-model', isLive() ? SAM_MODEL : 'mock');
    res.headers.set('x-aei-usage', JSON.stringify(takeLastUsage() ?? mockUsage()));
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'segmentation failed' },
      { status: 502 },
    );
  }
}
