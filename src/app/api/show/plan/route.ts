import { NextResponse } from 'next/server';
import { planShow, type PlanFeedback } from '../../../../meta';
import { isLive } from '../../../../meta/config';
import { MUSE_SPARK_MODEL } from '../../../../meta/metaClient';
import { mockUsage, takeLastUsage } from '../../../../meta/usage';
import type { PlannerInput } from '../../../../types';

export async function POST(req: Request) {
  const { input, feedback } = (await req.json()) as {
    input: PlannerInput;
    feedback?: PlanFeedback;
  };
  const plan = await planShow(input, feedback);
  const res = NextResponse.json(plan);
  res.headers.set('x-aei-model', isLive() ? MUSE_SPARK_MODEL : 'mock');
  res.headers.set('x-aei-usage', JSON.stringify(takeLastUsage() ?? mockUsage()));
  return res;
}
