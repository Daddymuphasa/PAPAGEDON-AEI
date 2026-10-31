import { NextResponse } from 'next/server';
import { generateEventImages } from '../../../../meta/museImage';
import { isLive } from '../../../../meta/config';
import { MUSE_IMAGE_MODEL } from '../../../../meta/metaClient';
import { mockUsage, takeLastUsage } from '../../../../meta/usage';
import { tagsForCount } from '../../../../visuals/prompts';
import type { EnergyTag, EventTheme } from '../../../../types';

// M7: theme -> event-styled artwork. Key stays server-side; the browser
// only sees data URLs. Usage counts every image call for the credit guard.
export async function POST(req: Request) {
  const { theme, count, tags } = (await req.json()) as {
    theme: EventTheme;
    count?: number;
    tags?: EnergyTag[];
  };
  if (!theme || !Array.isArray(theme.palette)) {
    return NextResponse.json({ error: 'theme with a palette is required' }, { status: 400 });
  }
  try {
    const want = Array.isArray(tags) && tags.length > 0 ? tags : tagsForCount(count ?? 4);
    const images = await generateEventImages(theme, want);
    const res = NextResponse.json({ images });
    res.headers.set('x-aei-model', isLive() ? MUSE_IMAGE_MODEL : 'mock');
    res.headers.set('x-aei-usage', JSON.stringify(takeLastUsage() ?? mockUsage()));
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'generation failed' },
      { status: 502 },
    );
  }
}
