# PAPAGEDON AEI — Architecture (R1 engine rebuild)

```
INPUT flyer ──> Spark vision ──> EventTheme ──┬──> DIRECTOR ──> scene events ──> dual-canvas WebGL2 stage
INPUT music ──> engine analyzer ──> signals ──┤      (local 2s layer + Spark ShowPlan layer)
INPUT crowd ──> SAM 3.1 (throttled) ──> vision read ──┘
```

The stage is the PAPAGEDON engine (`src/lib/papagedon`): audio analyzer,
experience graph, and a WebGL2 renderer running 74 converted pack shaders
from `public/papagedon-core`. The director (`src/director/ShowDirector`)
sits beside it: a fast local layer (2s tweaks, build/drop/breakdown
events, phrase boundaries) plus a slow Muse Spark ShowPlan layer (~20s
cadence or on energy shifts, verified with retry and fallback). Scene
events go straight to the page callback — no bus, one window.

## Data flow

- **Audio:** `AudioEngine` (file/mic/loopback) → `AudioAnalyzer` →
  `ExperienceSignals` → per-frame engine render AND
  `engineSignalsToFeatures` → `director.frame`. Director intensity scales
  the rendered signals; params drive saturation/exposure; speed drives
  the evolution phase.
- **Visuals:** planner picks a catalog id → page crossfades the back
  canvas (cut/flash-cut honoured) → canvases swap roles. Manual picks
  call `director.manual` so the planner holds for 8s.
- **Flyer:** upload → `POST /api/theme` extract → local checks →
  `POST /api/theme/judge` → retry (max 3) or last good →
  `director.opening` + engine theme override from the colour roles.
- **Event art:** `POST /api/visuals/generate` → browser verify (decode,
  dims, palette) → retry once → gradient fallback → director
  energy-tag picks → texture layer (`screen` blend, director mix).
- **Crowd:** camera frame every ~3s → `POST /api/vision/segment` →
  smoothed crowd/performer signals → `director.setVision` (energy gain
  + planner context).
- **Generated visuals:** `POST /api/visuals/shader` → static scan →
  browser compile on a scratch renderer → retry once with the errors →
  stage it, or keep the last good visual. Staged visuals join the
  director defs so Spark can pick them too.
- **Track maps:** file upload → `POST /api/track/analyze` (Modal DSP,
  compute only) → verified map → drop pre-cues; `{ok:false}` keeps
  live-only mode.

## Contracts

- **Engine GLSL** (`src/visuals/shaderContract.ts`, `shaders/engine-template.frag`):
  ES 3.00 body, `in vec2 vUV`, `out vec4 fragColor`, engine uniforms
  only, no textures, no `#version` line (the adapter adds the header).
- **Catalog sync** (`shaders/catalog.test.ts`): `CATALOG` matches the
  engine manifest and the converted files on disk, and Badman/Trance
  moods match the core metadata JSON.
- **Credit guard** (`src/director/credit.ts`): every model response is
  counted from the `x-aei-usage` header; caps drop the show to
  local-only with a decision-log entry.
- **Mock/live** (`AEI_LIVE`, `src/meta/config.ts`): mock returns
  deterministic local results with zero network. All model calls run
  server-side via `src/app/api/*`; keys live only in `.env.local`.
- **Hygiene** (`scripts/check-clean.test.ts`): no web3, wallet, Celo,
  depth-studio, OpenCV, live-site, or credit residue in code or assets.

## Deployment

`basePath: /meta` in `next.config.mjs`; links and fetches go through
`withBasePath`. Standalone project at `meta.papagedon.com` — never
touches or depends on the live papagedon.com site.
