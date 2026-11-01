import { NextResponse } from 'next/server';
import { judgeTheme } from '../../../../meta';
import { isLive } from '../../../../meta/config';
import { MUSE_SPARK_MODEL } from '../../../../meta/metaClient';
import { mockUsage, takeLastUsage } from '../../../../meta/usage';
import type { EventTheme } from '../../../../types';

export async function POST(req: Request) {
  const { flyerDataUrl, theme, availableIds, samplePalette } = (await req.json()) as {
    flyerDataUrl: string;
    theme: EventTheme;
    availableIds?: string[];
    samplePalette?: string[];
  };
  const verdict = await judgeTheme(flyerDataUrl ?? '', theme, availableIds, samplePalette);
  const res = NextResponse.json(verdict);
  res.headers.set('x-aei-model', isLive() ? MUSE_SPARK_MODEL : 'mock');
  res.headers.set('x-aei-usage', JSON.stringify(takeLastUsage() ?? mockUsage())); // M4 credit guard
  return res;
}
