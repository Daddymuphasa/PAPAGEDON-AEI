import { NextResponse } from 'next/server';
import { extractTheme, type ExtractFeedback } from '../../../meta';
import { isLive } from '../../../meta/config';
import { MUSE_SPARK_MODEL } from '../../../meta/metaClient';
import { mockUsage, takeLastUsage } from '../../../meta/usage';
import '../../../../shaders/example-bass-pulse'; // side effect: registry ids for the prompt (M2)

export async function POST(req: Request) {
  const { flyerDataUrl, feedback } = (await req.json()) as {
    flyerDataUrl: string;
    feedback?: ExtractFeedback;
  };
  const theme = await extractTheme(flyerDataUrl ?? '', feedback);
  const res = NextResponse.json(theme);
  res.headers.set('x-aei-model', isLive() ? MUSE_SPARK_MODEL : 'mock');
  res.headers.set('x-aei-usage', JSON.stringify(takeLastUsage() ?? mockUsage())); // M4 credit guard
  return res;
}
