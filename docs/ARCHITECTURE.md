# PAPAGEDON AEI — Architecture (M1)

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
`src/meta`, `shaders` (template + registry + `pack/` for M6), `docs`.

Cost rules: MOCK by default (`AEI_LIVE=true` for real calls); every model
response cached by input hash; rate-limited; never a model call per frame —
fast audio runs locally every frame, smart calls run on 10-30s chunks,
crowd on ~3s frames, director on ~2s ticks. Clients are server-side only,
reached via `src/app/api/*`. See README for the exact call-site table.
