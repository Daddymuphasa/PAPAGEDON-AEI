import { NextResponse } from 'next/server';
import { generateShaderSource } from '../../../../meta/shader';
import { mockUsage, takeLastUsage } from '../../../../meta/usage';
import type { EventTheme } from '../../../../types';
import type { ShaderBrief, ShaderFeedback } from '../../../../visuals/shaderContract';

// Muse Spark writes an engine-conformant GLSL visual. The browser
// compile-checks the result; failures never reach the stage.
export async function POST(req: Request) {
  const { theme, brief, feedback } = (await req.json()) as {
    theme?: EventTheme | null;
    brief?: ShaderBrief;
    feedback?: ShaderFeedback;
  };
  try {
    const { glsl, model } = await generateShaderSource(theme ?? null, brief, feedback);
    const res = NextResponse.json({ glsl });
    res.headers.set('x-aei-model', model);
    res.headers.set('x-aei-usage', JSON.stringify(takeLastUsage() ?? mockUsage()));
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'generation failed' },
      { status: 502 },
    );
  }
}
