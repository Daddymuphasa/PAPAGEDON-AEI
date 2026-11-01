# PAPAGEDON AEI — Architecture (M8)

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
`src/meta`, `src/app/{gallery,show}`, `shaders` (template + registry +
`m3/` flagships + `pack/` for M6), `docs`.

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
all sixty-three with zero new dependencies.

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

## M4 Director Live (two-speed director, two-window show)

```
audio in ──> fast local layer (every frame + 2s tick, no AI)
  beats/energy ──> accents, 2s eased tweaks, build/drop/breakdown reactions,
                   phrase-boundary (8/16 beats) transition execution
audio summary (20s) ──> slow layer: POST /api/show/plan ──> muse-spark-1.3
  every 20s or on energy shifts (≥8s apart) ──> ShowPlan ──> verifyShowPlan
  ──> retry ≤3 with feedback ──> last-good fallback ──> apply at boundary
```

`ShowPlan` (new type; M1 `ScenePlan` untouched): visualId, params[3] inside
declared ranges, intensity, speed, paletteEmphasis 0-3, transition
{crossfade|cut|flash-cut, 0-2000ms}, energyArc, sectionSeconds 10-60,
one-line reason. Verification also forbids a third consecutive repeat.
Manual panel edits override instantly, hold 8s, log as "manual".

Sync (reworked in M4.2 — see below): control owns the director and posts
scene/tweak/hit/blackout/audio messages over a `BroadcastChannel`.

Credit guard: every Meta call stashes `{calls, input/output/reasoning
tokens, latency}` server-side, delivered per-call in `x-aei-usage`; the
laptop store totals them against a call cap (default 100, editable) plus
an optional token cap, then stops calls with "cap reached, local only"
while the show continues. Mock usage is recorded marked as mock.

## M4.1 analyzer upgrade (local DSP, no AI)

`LocalAudioAnalyzer` runs fftSize 2048 with light FFT smoothing (0.35).
Bands come from `sampleRate`/bin width, never hardcoded bins: subBass
20-60 Hz, bass 60-250 Hz, mid 250-4000 Hz, high 4000-12000 Hz, each
normalized 0-1. Spectral flux is the mean positive per-bin increase,
weighted 1.0/0.6/0.25 toward low and mid.

Beats are adaptive over ~1.5s of history: fire when (sub+bass)/2 exceeds
its mean x 1.35 and flux exceeds its mean x 1.5, both above small floors,
with a 120ms cooldown. Confidence is the averaged threshold margin 0-1.
BPM is the median of recent inter-beat intervals gated to 60-200, folded
to 80-170, reported as an integer once 4+ tight intervals agree (else 0).
Energy is band-weighted and smoothed separately so meters stay steady
while beats stay sharp. `buildUp`/`drop` reuse the `energy.ts` detectors.
Pure helpers live in `src/inputs/audio/dsp.ts` and are unit-tested.

Show sync was reworked in M4.2 (below): no more dual playback or drift
snapping — one listener streams features to the projector.

## M4.2 show sync (one listener, streamed features)

Control is the only listener: it analyzes the audible file/mic (or mock)
and posts a compact `feat` packet every animation frame over the existing
`BroadcastChannel` — seq, ts plus 11 numbers (bands, energy, flux, beat,
confidence, BPM, buildUp, drop). No arrays, no audio bytes. Output holds
no audio element, mic, or analyzer: it renders the latest packet each
frame, latching each beat seq so it renders exactly once, and reports
`outStats` (fps, ms since last packet) back once a second.

If no packet arrives for 250ms, output eases to a local mock signal at
the last BPM with a dim "no audio stream" tag (hidden 3s after entering
fullscreen) and resumes instantly on packets. Control shows the packet
rate in Hz plus the output's stats. Packet `ts` values are informational
only — `performance.now` origins differ per window and are never compared
across windows. The old file-bytes post, scheduled dual start, drift
snapping, and output Enable-audio prompt are removed.

## M5 track pre-analysis (Modal compute only, no AI)

```
file bytes ──> POST /api/track/analyze ──> Modal CPU endpoint
  (≤50MB, 30s cap, token header)      librosa DSP: tempo/beats,
  {ok:false} on any failure            2 Hz energy, sections
        │                                     │
        ▼                                     ▼
live analysis only              verifyTrackMap ──> ShowDirector.setTrackMap
```

Modal runs pure signal processing — beat tracking, RMS energy, and a
rule-based section splitter (smoothed-energy runs mapped to
intro/build/drop/breakdown/outro, snapped contiguous over 0..duration).
**No models run on Modal and no AI calls leave Meta**: the endpoint
holds no weights and makes no inference calls; `extractTheme`,
`judgeTheme`, and `planShow` remain Muse Spark via the Meta Model API,
and the Modal hop never touches the call/token caps.

The proxy route (`src/app/api/track/analyze/route.ts`) reads
`MODAL_ANALYZE_URL`/`MODAL_ANALYZE_TOKEN` server-side and answers
`{ ok:false }` when the vars are missing, the upload is empty or over
50MB, Modal errors, or 30s elapse. The client verifies the JSON
(`src/director/trackMap.ts`: shape, finite numbers, bpm 40-220,
energy 0-1, strictly increasing times, sections tiling 0..duration)
and rejects bad maps back to live-only.

With a valid map, the director schedules pre-cues on the track clock
(`performance.now − t0`, file/mock sources only): ~2s before a mapped
drop it logs a `map` pre-cue and holds local intensity at 0.65×, then
logs a `map` hit and releases on the boundary. Each Muse Spark plan
request also carries the next 3 section changes (60s horizon) in its
prompt context, plus one anticipation sentence that only appears when
a map is attached. Control shows `Track map: analyzing / ready /
unavailable` with a section timeline and playhead. Mock mode attaches
a deterministic 120s two-drop map, so pre-cues work with no Modal.

## M6 smart listening (local DSP, no AI)

Mic opens raw (`echoCancellation`/`noiseSuppression`/`autoGainControl`
all false) so browser voice filters never eat kicks or transients.

Beats are retuned to an either-or rule (replaces the M4.1 both-must-pass
rule): the kick arm fires when bass exceeds 1.15x its ~1s rolling
average AND flux exceeds 1.2x its own ~1s average; the sub arm fires on
subBass alone above 1.3x its ~0.5s average with an absolute 0.1 floor,
for 808s. 120ms cooldown; small absolute floors on every arm so
silence (and hi-hat-only ticks) never trigger. Confidence is the firing
arm's threshold margin, maxed when both fire.

Per-frame reactivity: `u_energy` rides a fast-attack (~15ms) /
slow-release (~220ms) envelope follower fed by the raw bands every
frame, on the show output and the gallery. The analyzer's heavier
smoothing stays for meters, build/drop detection, and feat packets;
the director's 2s tweaks and 20s plans still own big creative moves.

Auto-calibration: mic/file start listens ~3s, then sets gain (loud-end
p90 mapped to 0.5, clamped 0.5-4x) and a noise floor (quiet-end p10).
Near-silence keeps unity so noise is never boosted. Control shows
`Calibrating…` then `Ready`, with a Recalibrate button; mock skips it.

Listening profile: every ~4s the director folds its frames into bpm
range, bass-heaviness, brightness, and dynamics, labels the room
(house/techno, afrobeats/amapiano-ish, hip-hop, ambient, or mixed)
with a confidence, and logs label changes as `listen`. Each Muse Spark
plan request carries the profile (plus one fit-to-the-music sentence
that only appears once a profile exists); cache keys gain the label
only when present. Control shows the label, confidence, and bpm next
to the beat flash and confidence readout.

## M7 event visuals (Muse Image textures over the shaders)

```
theme ──> POST /api/visuals/generate ──> muse-image-1.0 × 4
  (calm/build/peak/drop)                        │ 1792x1024 webp b64
  per-theme cached,                         verify each (decode/dims/
  cap-blocked when capped                   8x8 palette sample)
                                                    │ retry once
                                                    ▼
  procedural palette gradient ◄── fallback ── verified EventImage set
        │                                              │
        └──────────> control panel + ──visuals msg──> output GL texture
                     director pick ──texture msg──> u_eventTex / u_texMix
```

Prompts (`src/visuals/prompts.ts`) are built from the event name,
genre, mood, palette, and motifs, asking for abstract loopable stage
textures with no text, logos, or faces. The server route is the only
caller of `muse-image-1.0` (key never reaches the browser), caches each
theme+tag for 24h, and stashes one aggregated usage entry so the credit
guard counts every image call. Mock mode returns four deterministic
procedural palette SVGs with no network.

Verification runs in the browser (`src/visuals/verifyImage.ts`):
decode, 64–4096px dimensions, and an 8x8 downsample scored against the
palette (≥45% of pixels near a palette colour). Failures retry once per
tag, then fall back to a canvas palette gradient. Every step logs as
`image`; over-cap generation is blocked and logged as `cap`.

The renderer uploads the active visual to texture unit 2 (the FBO mix
pass owns 0–1) and sets `u_eventTex`/`u_texMix` every frame; all sixty-three
library shaders end with an identical layer that displacement-samples the
artwork and blends it over the shader colour (a no-op at mix 0, so the
gallery and benchmarks are untouched). The output window decodes the
`visuals` bus payload, binds the director's `texture` pick, and pushes
the mix up on every beat through a dedicated M6 envelope.

The director (`src/director/texturePick.ts`, pure) matches the section
arc to an energy tag, honours valid plan `texture`/`texMix` fields
(verified against the enabled ids, else energy-tag fallback), and cuts
to drop art on drop hits. Control's Event visuals panel shows
thumbnails with per-image toggles, a Regenerate button (force, still
cap-guarded), and a texMix slider that overrides for the 8s manual
hold. `npm run check:meta` (`scripts/check-meta.ts`) probes Spark chat,
image generation, and SAM responses with OK/FAIL + status per call.

## M8 camera vision (SAM 3.1 performer/crowd segmentation)

```
camera ──> tick 1-5s ──> POST /api/vision/segment ──> sam-3.1 x 2
  640px JPEG,            (key server-side,      "performer"+"crowd"
  memory only             usage per call)         │ output_text
                                                  ▼
  mock blob+band ◄── MOCK ── official @meta-sam/parser ── boxes+masks
  (zero network)                                  │ fallback phrasing on empty
                                                  ▼
  verify (dims/boxes/counts) ── signals (box/present/coverage/motion)
    │ fail: keep last good          │ smoothed per tick
    ▼                               ▼
  `sam`/`cap` log            director + ──seg msg──> output GL texture
  (no images)                energy/planner    u_segMask / u_perfBox
```

`src/meta/sam.ts` is the only caller of `sam-3.1` (key never reaches
the browser): data-URL frames with a `/v1/files` upload retry when
data URLs are rejected, a 4s per-call timeout, and one fallback
phrasing when a prompt comes back empty — transport errors fail the
tick instead of retrying. The official parser reads `output_text`
(empty means zero matches, valid); detections rasterize into 128px
binary grids (mask pixels win, box-only fills its rect) that cross to
the browser as base64. Mock mode serves a deterministic drifting blob
and rippling crowd band.

The browser tick (`src/vision/client.ts`) verifies each result,
derives coverage plus last-two-mask motion, smooths every signal, and
logs one `sam` entry per tick. The director stores the compact read
(`VisionPrompt`), nudges its energy buffer by motion x 0.08, and hands
Muse Spark the vision state with a framing sentence; the cache key
gains the read only while the camera runs. The renderer uploads the
eased RGBA grid to texture unit 3 (FBO mix owns 0-1, event art owns 2)
and sets the seg uniforms every frame; all sixty-three library shaders end with an
identical tail (performer rim + glow, crowd boost, motion pulse) that
is a no-op at mix 0, so the gallery and benchmarks are untouched. The
output window decodes each `seg` payload, eases grids/box/motion per
frame, and fades stale masks after 10s. `npm run check:meta` probes
SAM with the exact `sam.ts` request shape, where HTTP 200 with empty
output counts as OK.

## M9-B visual quality loop + Pack 3D (three.js where necessary)

A 63-shader headless contact sheet (SwiftShader) showed eleven weak
looks: one empty-triangle SDF bug (Prism Burst), one inverted grid
perspective (Trance Horizon), four over-bright flat backgrounds
(Rising Doves, Rose Petal Fall, Glory Clouds, Rainforest Canopy —
rebuilt with dark palette-scaled skies), and five over-gated idle
states (Lightning Storm, Warehouse Fog, Kinetic Colonnade,
Circuit Veins, plus a Confetti Burst ambient rain layer so drops are
not the only state). Fixes keep the uniform contract, tails, quality
knob, and metadata untouched.

True geometry lives beside the fragment library, not in it:
`scenes/pack3d/` holds `Scene3DDefinition` objects (Planet Rings 3D,
Neon Tunnel 3D) driven by plain-data `SceneUniforms` — the same
contract fields (time/energy/beat/bands/palette/p1-p3/motion) the
fragment shaders read. `src/engine/threeStage.ts` owns one
`WebGLRenderer`, a shared camera, per-frame uniform mapping, and
dispose-on-swap; scenes never touch audio or GL state. Pages that
render visuals (gallery, control preview, output) stack the three
canvas over the fragment canvas via `src/engine/stagePair.ts`:
fragment-to-fragment keeps the GPU crossfade, anything involving a
scene dips through black (~500ms) so there is never a hard cut, and
the control preview cuts (it is a monitor, not the show). The
director's `defs` widened from `ShaderDefinition[]` to
`VisualDefinition[]` (it only ever read id/name/tags/params/meta),
so Muse Spark and the mock planner pick from all 65 visuals; the
verifier already took `{id, params}` and needed no change. Known
limitation: 3D scenes honour palette/audio/motion but not the
event-art texture or performer mask yet — geometry has no fragment
tail to hang them on.
