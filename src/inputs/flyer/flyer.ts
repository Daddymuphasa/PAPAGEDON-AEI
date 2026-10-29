// INPUT 1 client helper: flyer upload -> POST /api/theme -> EventTheme.
// Full M2 wiring (preview, palette display) lands in M2.
import type { EventTheme } from '../../types';

export async function requestTheme(flyerDataUrl: string): Promise<EventTheme> {
  const res = await fetch('/api/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flyerDataUrl }),
  });
  if (!res.ok) throw new Error('theme request failed');
  return (await res.json()) as EventTheme;
}
