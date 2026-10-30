"""M5 track pre-analysis on Modal (compute only - no AI models here).

CPU-only DSP (librosa/numpy): decode one audio upload, estimate tempo and
beats, build a 2 Hz energy curve, and split the track into labeled
sections (intro/build/drop/breakdown/outro) so the director can anticipate
drops instead of reacting late.

Deploy machine needs only Modal + FastAPI; DSP deps live in the image:
    pip install modal fastapi
    modal setup
    modal secret create aei-analyze-auth AEI_ANALYZE_TOKEN=<long-random>
    modal deploy modal/analyze_track.py   # from the repo root

Then set MODAL_ANALYZE_URL to the printed https URL and MODAL_ANALYZE_TOKEN
to the same token in the Next.js .env. Requests without the token header
are rejected; keys never appear in this file.
"""

from __future__ import annotations

import hmac
import os
import tempfile

import modal
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

APP_NAME = "papagedon-aei-analyze"
SECRET_NAME = "aei-analyze-auth"
TOKEN_ENV = "AEI_ANALYZE_TOKEN"
TOKEN_HEADER = "x-aei-token"
MAX_BYTES = 50 * 1024 * 1024
SAMPLE_RATE = 22050
ENERGY_HZ = 2

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("numpy", "librosa", "audioread")
)

app = modal.App(APP_NAME)
web_app = FastAPI()


def segment_sections(energy: list[float], hz: int, duration: float) -> list[dict]:
    """Split an energy curve into kind-labeled sections tiling [0, duration].

    Pure DSP heuristic, no models: smooth the curve, label hi/mid/lo runs,
    map runs to kinds (first low run intro, highs drop, rises build,
    post-drop lows breakdown, final low outro), then snap boundaries so
    sections are contiguous with no gaps or overlaps.
    """
    if not energy or duration <= 0:
        return [{"start": 0.0, "end": round(max(duration, 0.0), 3), "kind": "intro"}]
    n = len(energy)
    width = 5
    smooth = []
    for i in range(n):
        lo = max(0, i - width // 2)
        hi = min(n, i + width // 2 + 1)
        smooth.append(sum(energy[lo:hi]) / (hi - lo))

    def label(v: float) -> str:
        if v >= 0.6:
            return "hi"
        if v <= 0.35:
            return "lo"
        return "mid"

    runs: list[list] = []
    for i, v in enumerate(smooth):
        lab = label(v)
        if runs and runs[-1][2] == lab:
            runs[-1][1] = i + 1
        else:
            runs.append([i, i + 1, lab])
    merged = [runs[0]]
    for s, e, lab in runs[1:]:
        if (e - s) / hz < 1.0:
            merged[-1][1] = e
        else:
            merged.append([s, e, lab])

    kinds: list[str] = []
    seen_drop = False
    last_idx = len(merged) - 1
    for idx, (s, e, lab) in enumerate(merged):
        rising = smooth[e - 1] - smooth[s] >= 0.12
        if lab == "hi":
            kind = "drop"
            seen_drop = True
        elif idx == last_idx and lab == "lo" and seen_drop:
            kind = "outro"
        elif idx == 0 and not rising and not seen_drop:
            kind = "intro"
        elif rising or (lab == "mid" and not seen_drop):
            kind = "build"
        else:
            kind = "breakdown" if seen_drop else "intro"
        kinds.append(kind)

    step = 1.0 / hz
    sections = [
        {"start": round(s * step, 3), "end": round(min(e * step, duration), 3), "kind": kind}
        for (s, e, _), kind in zip(merged, kinds)
    ]
    sections[0]["start"] = 0.0
    sections[-1]["end"] = round(duration, 3)
    fixed = [sections[0]]
    for sec in sections[1:]:
        sec["start"] = fixed[-1]["end"]
        if sec["end"] > sec["start"]:
            fixed.append(sec)
    return fixed


def decode_audio(data: bytes):
    """Decode upload bytes to mono 22050 Hz float samples.

    soundfile (via librosa) handles wav/flac/ogg; mp3/m4a fall back to
    audioread+ffmpeg. Raises ValueError when nothing can decode the bytes.
    """
    import librosa  # local import: DSP deps live in the Modal image only

    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "track.bin")
        with open(path, "wb") as fh:
            fh.write(data)
        try:
            return librosa.load(path, sr=SAMPLE_RATE, mono=True)
        except Exception:
            pass
        try:
            import audioread
            import numpy as np

            with audioread.audio_open(path) as f:
                raw = b"".join(chunk for chunk in f)
                orig_sr, channels = f.samplerate, f.channels
            y = np.frombuffer(raw, dtype="<i2").astype("float32") / 32768.0
            if channels > 1:
                y = y.reshape(-1, channels).mean(axis=1)
            if orig_sr != SAMPLE_RATE:
                y = librosa.resample(y, orig_sr=orig_sr, target_sr=SAMPLE_RATE)
            return y, SAMPLE_RATE
        except Exception as exc:
            raise ValueError(f"could not decode audio ({exc})") from exc


def build_track_map(data: bytes) -> dict:
    """Run the full analysis and return the track-map JSON dict."""
    import librosa
    import numpy as np

    y, sr = decode_audio(data)
    if y.size == 0:
        raise ValueError("decoded audio is empty")
    duration = round(float(librosa.get_duration(y=y, sr=sr)), 3)
    tempo_arr, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
    tempo = float(np.atleast_1d(tempo_arr)[0])
    while tempo < 70:  # fold octave errors into a musical range (M4.1 style)
        tempo *= 2
    while tempo > 180:
        tempo /= 2
    beats = [round(float(t), 3) for t in librosa.frames_to_time(beat_frames, sr=sr).tolist()]
    beats = [t for t in beats if t <= duration]
    downbeats = beats[::4]  # 4/4 assumption, documented
    hop = max(1, sr // ENERGY_HZ)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    peak = float(rms.max()) if rms.size else 0.0
    energy = []
    for i, v in enumerate(rms.tolist()):
        t = round(i / ENERGY_HZ, 3)
        if t > duration:
            break
        energy.append({"t": t, "v": round(float(v) / peak, 4) if peak > 0 else 0.0})
    sections = segment_sections([p["v"] for p in energy], ENERGY_HZ, duration)
    return {
        "durationS": duration,
        "bpm": round(tempo, 1),
        "beats": beats,
        "downbeats": downbeats,
        "energy": energy,
        "sections": sections,
    }


@web_app.post("/")
async def analyze_track(request: Request):
    expected = os.environ.get(TOKEN_ENV, "")
    presented = request.headers.get(TOKEN_HEADER, "")
    if not expected or not hmac.compare_digest(presented, expected):
        return JSONResponse({"error": "unauthorized"}, status_code=401)
    body = await request.body()
    if not body:
        return JSONResponse({"error": "empty upload"}, status_code=400)
    if len(body) > MAX_BYTES:
        return JSONResponse({"error": "upload exceeds 50MB"}, status_code=413)
    try:
        track_map = build_track_map(body)
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=422)
    except Exception:
        return JSONResponse({"error": "analysis failed"}, status_code=500)
    return JSONResponse(track_map)


@app.function(image=image, cpu=1.0, timeout=300, secrets=[modal.Secret.from_name(SECRET_NAME)])
@modal.asgi_app()
def api():
    return web_app
