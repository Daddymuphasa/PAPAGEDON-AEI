// M9-A audio engine state: awaited resume with one retry, plus the
// status-bar label. Takes a minimal context shape so tests use fakes.
export type AudioState = 'running' | 'suspended' | 'closed' | 'missing';

export interface ResumableContext {
  readonly state: string;
  resume(): Promise<unknown>;
}

export async function resumeAudioContext(ctx: ResumableContext | null): Promise<AudioState> {
  if (ctx === null || ctx === undefined) return 'missing';
  const first: string = ctx.state; // locals: the live state changes under us
  if (first === 'running') return 'running';
  if (first !== 'suspended') return 'closed'; // closed/interrupted: resume cannot help
  try {
    await ctx.resume();
  } catch {
    /* fall through to the retry */
  }
  const second: string = ctx.state;
  if (second === 'running') return 'running';
  try {
    await ctx.resume();
  } catch {
    /* report below */
  }
  const third: string = ctx.state;
  return third === 'running' ? 'running' : 'suspended';
}

export function audioStateLabel(s: AudioState): { text: string; tone: 'ok' | 'warn' | 'muted' } {
  switch (s) {
    case 'running':
      return { text: 'Audio Running', tone: 'ok' };
    case 'suspended':
      return { text: 'Audio Suspended — click anywhere', tone: 'warn' };
    case 'closed':
      return { text: 'Audio Closed — reload the page', tone: 'warn' };
    case 'missing':
      return { text: 'Audio Mock', tone: 'muted' };
  }
}
