import { NextResponse } from 'next/server';
import { extractTheme, type ExtractFeedback } from '../../../meta';
import { isLive } from '../../../meta/config';
import { MUSE_SPARK_MODEL } from '../../../meta/metaClient';
import { mockUsage, takeLastUsage } from '../../../meta/usage';
import { apiError } from '../apiError';

export async function POST(req: Request) {
  try {
    const { flyerDataUrl, feedback, availableIds } = (await req.json()) as {
      flyerDataUrl: string;
      feedback?: ExtractFeedback;
      availableIds?: string[];
    };
    const theme = await extractTheme(flyerDataUrl ?? '', feedback, availableIds);
    const res = NextResponse.json(theme);
    res.headers.set('x-aei-model', isLive() ? MUSE_SPARK_MODEL : 'mock');
    res.headers.set('x-aei-usage', JSON.stringify(takeLastUsage() ?? mockUsage())); // M4 credit guard
    return res;
  } catch (err) {
    return apiError(err);
  }
}
