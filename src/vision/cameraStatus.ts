// M9-A camera errors in plain words + a frame-flow waiter, so the UI
// button says ON only when pictures actually arrive. Pure; Node-safe.
export function cameraErrorMessage(name: string | undefined, detail?: string): string {
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera blocked — click the camera icon in the address bar, choose Allow, then Try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera found — plug one in (or pick another), then Try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera is busy — close Zoom, Teams, or other tabs using it, then Try again.';
    case 'SecurityError':
      return 'Camera needs a secure page — open this app via localhost or HTTPS, then Try again.';
    case 'AbortError':
      return 'Camera request was interrupted — Try again.';
    case 'NoFrames':
      return 'Camera opened but no picture arrived — unplug it and plug it back in, then Try again.';
    case undefined:
    case 'TypeError':
      return 'Camera is not available here — use Chrome or Edge over localhost or HTTPS.';
    default:
      return `Camera error (${name}${detail ? `: ${detail}` : ''}) — Try again.`;
  }
}

// Poll probe until true or the timeout. Resolves true on frames, false
// on timeout; a throwing probe counts as no frames yet.
export async function waitForFrames(probe: () => boolean, timeoutMs = 3000, stepMs = 100): Promise<boolean> {
  const t0 = Date.now();
  for (;;) {
    let ok = false;
    try {
      ok = probe();
    } catch {
      ok = false;
    }
    if (ok) return true;
    if (Date.now() - t0 >= timeoutMs) return false;
    await new Promise((r) => setTimeout(r, stepMs));
  }
}
