import { NextResponse } from 'next/server';
import { judgeTheme } from '../../../../meta';
import { isLive } from '../../../../meta/config';
import { MUSE_SPARK_MODEL } from '../../../../meta/metaClient';
import { mockUsage, takeLastUsage } from '../../../../meta/usage';
import type { EventTheme } from '../../../../types';
import '../../../../../shaders/example-bass-pulse'; // side effect: registry ids for the mock judge (M2)

export async function POST(req: Request) {
  const { flyerDataUrl, theme } = (await req.json()) as {
    flyerDataUrl: string;
    theme: EventTheme;
  };
  const verdict = await judgeTheme(flyerDataUrl ?? '', theme);
  const res = NextResponse.json(verdict);
  res.headers.set('x-aei-model', isLive() ? MUSE_SPARK_MODEL : 'mock');
  res.headers.set('x-aei-usage', JSON.stringify(takeLastUsage() ?? mockUsage())); // M4 credit guard
  return res;
}
