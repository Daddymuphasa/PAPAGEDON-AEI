# PAPAGEDON AEI — Architecture (M3)

```
INPUT 1 flyer ──> Muse Spark vision ──> EventTheme ──┐
                                                    ├─> DIRECTOR ──> ScenePlan ──> WebGL visualizer
INPUT 2 music ──> Web Audio (fast, local) ──> AudioFeatures ──┤  (async tick,
              └─> Transcribe + Spark (smart, throttled) ──> MusicInsight ──┘   never blocks render)
INPUT 3 crowd ──> SAM 3.1 (throttled, optional) ──> CrowdSignal ──┘
```

Director reasoning provider is switchable by config (`AEI_DIRECTOR_PROVIDER`):
Muse Spark via the Meta Model API, or Muse Spark Open
(`meta-models/muse-spark-open-1026`) via Baseten.

Folders: `src/inputs/{flyer,audio,crowd}`, `src/director`, `src/engine`,
`src/meta`, `src/app/gallery`, `shaders` (template + registry + `m3/` flagships
+ `pack/` for M6), `docs`.

Cost rules: MOCK by default (`AEI_LIVE=true` for real calls); every model
response cached by input hash; rate-limited; never a model call per frame —
fast audio runs locally every frame, smart calls run on 10-30s chunks,
crowd on ~3s frames, director on ~2s ticks. Clients are server-side only,
reached via `src/app/api/*`. See README for the exact call-site table.

## M2 verification flow

```
flyer upload -> POST /api/theme (extract) -> plain checks (local)
  -> POST /api/theme/judge (judge) -> pass? apply : retry with feedback (max 3)
  -> still failing? keep last good theme + log
```

`verifyThemePlain` (`src/inputs/flyer/verifyTheme.ts`) checks: required
fields, hex palette, registered shader ids, tempo 60-180 BPM, scene-switch
2-30s. Only verified themes reach the Apply button, and the whole flow is
async — the render loop never waits. In MOCK mode the judge verdict is
deterministic (no keys); in LIVE mode both calls hit `muse-spark-1.3`.

## M2 decision log

Every director step appends to an in-memory log (`src/director/decisionLog.ts`,
last 50 entries): time, step (plan/act/observe/verify), model
(`muse-spark-1.3`/`mock`/`local`), short input summary (never image data),
result, verify pass/fail + reason, retry count, latency. Shown in the
`DecisionLogPanel` overlay with a show/hide toggle.

## M3 visual pack (no theme pipeline, no AI calls)

Five flagship fragment-shader visualizers in `shaders/m3/`: Hex Core,
Aegis Scales, Circuit Veins, Warp Tunnel, Prism Burst. All are new code
written during the hackathon; nothing is copied from any other repo or
product. Raw WebGL was kept over three.js: every look is procedural
fullscreen-shader math, so one renderer interface and one registry serve
all five with zero new dependencies.

Render path: `Renderer.renderVisual()` takes palette/intensity from the
shared `VisualParams` panel object plus an eased beat `pulse`; switches
run a 600ms smoothstep crossfade (`renderCrossfade`, dual FBO + mix blit).
Uniforms added: `u_energy`, `u_bpm`, `u_speed`, `u_pulse`, `u_p1..p3`
(per-visualizer knobs from each def's `params` ranges).

Budgets per visualizer: ≤1 draw call steady-state (≤3 during crossfade),
0 post passes, 0 textures, fullscreen-triangle only, ≤64 loop iterations
per pixel. Registration gate (`verifyVisualizer` + `registerVisualizer`):
static checks, compile, and a 60-frame benchmark floored at 30fps —
failures are logged to the decision log and never registered. Runtime
fallback (`FpsMonitor`): rolling 60-frame average below 45fps steps render
scale 1 → 0.75 → 0.5; above 55fps for 120 frames steps back up.
