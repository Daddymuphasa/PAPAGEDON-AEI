import { NextResponse } from 'next/server';
import { planScene } from '../../../meta';
import type { DirectorInput } from '../../../types';

export async function POST(req: Request) {
  const input = (await req.json()) as DirectorInput;
  const plan = await planScene(input);
  return NextResponse.json(plan);
}
