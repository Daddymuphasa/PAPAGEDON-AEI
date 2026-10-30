# M5 track analysis on Modal (compute only, no AI models)

`analyze_track.py` is a CPU-only Modal web endpoint: it decodes one audio
upload with librosa/numpy DSP and returns a track map
(`durationS`, `bpm`, `beats`, `downbeats`, 2 Hz `energy`, `sections`).
No model weights, no inference calls — all AI in this repo stays on Meta.

## Deploy

From the repo root (deploy machine needs only Modal + FastAPI):

```bash
pip install modal fastapi
modal setup
modal secret create aei-analyze-auth AEI_ANALYZE_TOKEN=<long-random-token>
modal deploy modal/analyze_track.py
```

Take the printed `https://...modal.run` URL and wire the Next.js side:

```bash
MODAL_ANALYZE_URL=https://<your-app>.modal.run
MODAL_ANALYZE_TOKEN=<same-token-as-the-secret>
```

Without these vars (or if Modal errors or takes >30s),
`POST /api/track/analyze` answers `{ ok:false }` and the show continues
with live analysis only. Mock mode uses a built-in deterministic map.
