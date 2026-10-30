# PAPAGEDON AEI — Architecture (M5)

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
