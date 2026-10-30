import { NextResponse } from 'next/server';
import { isLive } from '../../../meta/config';
import { MUSE_SPARK_MODEL } from '../../../meta/metaClient';

export async function GET() {
  return NextResponse.json({ live: isLive(), model: MUSE_SPARK_MODEL });
}
