// M9-A standby driver: an AudioWorklet tick keeps analysis + bus posting
// alive when the control tab is hidden (rAF is paused there, but the
// audio thread is not). Pure coordination + worklet source; the page
// owns the nodes. The worklet outputs silence; it only carries time.
export const STANDBY_TICK_BLOCKS = 8; // one tick per 8 render quanta (~23ms)
export const STANDBY_TAKEOVER_MS = 120; // rAF silent this long -> standby drives

export const STANDBY_WORKLET_SRC = `
class AeiTick extends AudioWorkletProcessor {
  constructor() {
    super();
    this.n = 0;
  }
  process(_inputs, outputs) {
    const out = outputs[0];
    if (out && out[0]) out[0].fill(0);
    this.n += 1;
    if (this.n % ${STANDBY_TICK_BLOCKS} === 0) this.port.postMessage({ t: 'tick' });
    return true;
  }
}
registerProcessor('aei-tick', AeiTick);
`;

// A standby tick drives a frame only when the rAF loop has gone quiet
// (hidden tab) — foreground frames always win, never double-drive.
export function shouldDriveFromStandby(nowMs: number, lastRafMs: number | null): boolean {
  return lastRafMs === null || nowMs - lastRafMs >= STANDBY_TAKEOVER_MS;
}
