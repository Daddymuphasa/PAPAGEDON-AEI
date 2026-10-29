import { NextResponse } from 'next/server';
import { extractTheme } from '../../../meta';

export async function POST(req: Request) {
  const { flyerDataUrl } = (await req.json()) as { flyerDataUrl: string };
  const theme = await extractTheme(flyerDataUrl ?? '');
  return NextResponse.json(theme);
}
