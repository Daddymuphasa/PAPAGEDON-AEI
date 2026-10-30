// INPUT 1 client helpers (M2): downscale -> extract -> judge.
// All model calls stay server-side behind /api/theme*.
import type { EventTheme, ThemeVerdict } from '../../types';
import { withBasePath } from '../../basePath';

export interface ThemeResponse {
  theme: EventTheme;
  model: string; // 'muse-spark-1.3' | 'mock', from the x-aei-model header
}

export interface JudgeResponse {
  verdict: ThemeVerdict;
  model: string;
}

// Shrink uploads so data URLs stay small (max dimension, JPEG).
export function downscaleImage(file: File, maxDim = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('could not read image'));
    };
    img.src = url;
  });
}

export async function requestTheme(
  flyerDataUrl: string,
  feedback?: { previousTheme: EventTheme; errors: string[] },
): Promise<ThemeResponse> {
  const res = await fetch(withBasePath('/api/theme'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flyerDataUrl, feedback }),
  });
  if (!res.ok) throw new Error(`theme request failed: ${res.status}`);
  return { theme: (await res.json()) as EventTheme, model: res.headers.get('x-aei-model') ?? '?' };
}

export async function requestJudge(flyerDataUrl: string, theme: EventTheme): Promise<JudgeResponse> {
  const res = await fetch(withBasePath('/api/theme/judge'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flyerDataUrl, theme }),
  });
  if (!res.ok) throw new Error(`judge request failed: ${res.status}`);
  return { verdict: (await res.json()) as ThemeVerdict, model: res.headers.get('x-aei-model') ?? '?' };
}
