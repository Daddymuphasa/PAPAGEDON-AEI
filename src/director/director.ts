// Director agent skeleton: merges theme + live audio + insight + crowd
// into a ScenePlan. Runs on its own async tick — the render loop NEVER
// awaits it; it only ever reads director.plan.
import type { DirectorInput, ScenePlan } from '../types';

export const defaultPlan: ScenePlan = {
  shaderId: 'example-bass-pulse',
  palette: ['#ff2d78', '#7b2dff', '#00e5ff', '#ffd166'],
  intensity: 0.6,
  textureUrl: null,
  transition: { type: 'fade', durationMs: 600 },
  lyricWords: [],
};

// Mock planner (MOCK mode): intensity follows bass + theme energy + crowd.
export function planLocal(input: DirectorInput): ScenePlan {
  const energy = input.theme?.energy ?? 0.6;
  const crowdBoost = input.crowd ? input.crowd.density * 0.2 : 0;
  return {
    ...defaultPlan,
    palette: input.theme?.palette ?? defaultPlan.palette,
    intensity: Math.min(1, input.features.bass * 0.6 + energy * 0.4 + crowdBoost),
    lyricWords: input.insight?.keywords.slice(0, 3) ?? [],
  };
}

export class DirectorAgent {
  plan: ScenePlan = defaultPlan;
  private timer: ReturnType<typeof setInterval> | null = null;

  start(getInput: () => DirectorInput, opts: { intervalMs?: number; live?: boolean } = {}): void {
    this.stop();
    const { intervalMs = 2000, live = false } = opts;
    const tick = () => {
      try {
        if (!live) {
          this.plan = planLocal(getInput());
          return;
        }
        // LIVE: fire-and-forget; the render loop keeps using the last plan.
        fetch('/api/director', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getInput()),
        })
          .then((r) => r.json())
          .then((p) => {
            this.plan = p as ScenePlan;
          })
          .catch(() => {});
      } catch {
        /* keep last plan */
      }
    };
    tick();
    this.timer = setInterval(tick, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
