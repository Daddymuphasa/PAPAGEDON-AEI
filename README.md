# PAPAGEDON AEI — Audio Experience Intelligence

## Provenance (read this first)

The PAPAGEDON visual engine, the `/app` experience UI, and the six core
shader packs pre-date this hackathon entry — earlier work by Daddy MUPHASA.
The new hackathon work is the Meta integration: Muse Spark visual director
plus Spark-authored visualizers, Muse Image event artwork, and SAM 3.1 crowd
vision — plus the director bridge, 12 original 3D signature shaders, verification, launchers, and docs in
this repo.

## What it is

- **Engine:** 86 shaders (74 converted: Badman 18, Festival 6, Hypnotic 6,
  Pulse 6, Signature 12, Trance 26; plus 12 original 3D signature) and 9 themes, running WebGL2 in the
  browser. File, mic, or loopback audio drives every frame. Scene changes
  crossfade across a dual canvas; drops flash; blackout is one event away.
- **Director:** Muse Spark picks the visual from the full catalog by energy,
  BPM, section, and mood (no immediate repeats), writes brand-new GLSL
  visuals (browser-verified, last-good fallback), reads event flyers into
  themes, blends generated event artwork over the stage, and reads the
  crowd through SAM to nudge the energy.
- **One page:** everything runs at `/meta`. MOCK by default — no keys, no
  network. `AEI_LIVE=true` switches on the real Meta calls behind the
  credit guard.

## Run it

- Double-click `run-app.bat`, pick **[1] live edit** or **[2] show mode**.
  It opens `http://localhost:3000/meta` for you.
- Needs Node.js. After this rebuild run `npm install` once: dependencies
  changed (tailwind in, three out).
- Double-click `run-tests.bat` for the typecheck plus the full vitest
  suite. No browser needed.

## Tour (what to click)

1. Drop an audio file (or pick mic/loopback) — the engine plays.
2. Upload an event flyer — the director opens the show in its colours.
3. Leave **Auto director** on — Spark drives the wall; watch **Decisions**.
4. **Generate event artwork** — textures blend over the shaders.
5. **Ask Spark for a visual** — a new shader is staged, and the director
   can pick it too.
6. **Shader check** — compiles all 86 shaders in your browser.
7. Turn the camera on — SAM crowd energy feeds the show.

## Mock vs live

- **Mock (default):** everything runs offline. Spark/SAM/Image calls return
  deterministic local results, artwork is procedural, and the decision log
  badges read MOCK/LOCAL.
- **Live:** copy `.env.example` to `.env.local`, set `MODEL_API_KEY` and
  `AEI_LIVE=true`. Keys never reach the browser — every model call goes
  through a Next.js route. `npm run check:meta` verifies access;
  `npm run check:secrets` keeps the template key-free.
- **Credit guard:** the Director panel shows calls/tokens against caps.
  Hitting a cap drops the show to local-only instead of failing.

## Layout

- `src/components/papagedon/PapagedonApp.tsx` — the stage (engine plus
  director wiring, crossfades, texture/blackout layers)
- `src/components/director/` — Director and flyer panels
- `src/lib/papagedon/` — engine: analyzer, experience graph, WebGL2
  renderer, catalog manifest, desktop-to-WebGL adapter
- `src/director/` — ShowDirector, engine bridge (`engineBridge`,
  `engineDefs`), credits, track maps
- `src/meta/` — Spark/Image/SAM clients, mock/live switch, cache, usage
- `src/inputs/{flyer,audio,crowd}` — flyer to theme, listening profile,
  crowd sampling
- `src/vision/` — SAM frame client, parsing, smoothing
- `src/visuals/` — event images, Spark GLSL generation, engine GLSL
  contract
- `src/app/api/` — server routes (theme, judge, show plan, visuals,
  shader, vision, track, mode)
- `shaders/` — converted-visual catalog plus sync tests and the engine
  GLSL template
- `public/papagedon-core/` — converted shaders, themes, provenance
  (`SOURCE.md`)
- `modal/` — track pre-analysis endpoint (DSP compute only, no AI models)
- `scripts/` — `check:meta`, `check:secrets`, repo hygiene test

## API routes (keys stay server-side)

| Route | Purpose |
| --- | --- |
| `POST /api/theme` | Flyer to verified EventTheme |
| `POST /api/theme/judge` | Judge pass/fail on a theme |
| `POST /api/show/plan` | Spark ShowPlan for the next section |
| `POST /api/visuals/generate` | Event artwork (calm/build/peak/drop) |
| `POST /api/visuals/shader` | Spark-authored GLSL visual |
| `POST /api/vision/segment` | SAM crowd/performer read |
| `POST /api/track/analyze` | Track pre-analysis proxy (Modal) |
| `GET /api/mode` | Mock/live badge state |

## Deploy

`basePath: /meta` everywhere — links and fetches go through
`withBasePath`. This is a standalone project deployed at
`meta.papagedon.com`; it never touches or depends on the live
papagedon.com site.

## Tests

`run-tests.bat` runs `tsc --noEmit` plus vitest: catalog to manifest to
disk sync, Badman/Trance mood parity, the ported engine audio suite,
bridge mappings, GLSL contract scans, director logic (planner, verify,
credits, transitions, vision, track), flyer/vision/visuals units, and a
repo hygiene scan (no web3, depth-studio, or live-site residue). GLSL
compiles only in a browser — the in-app **Shader check** covers that.
