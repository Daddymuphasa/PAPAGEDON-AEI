// INPUT 2 smart layer skeleton (M4): rolling 10-30s chunks ->
// Muse Voice Transcribe + Muse Spark. Chunking only, never per-frame.
// Upload + /api/smart route land in M4.
export const CHUNK_SECONDS = 15;

export class ChunkRecorder {
  private chunks: Float32Array[] = [];
  onChunk: ((samples: Float32Array) => void) | null = null;

  push(samples: Float32Array, sampleRate: number): void {
    this.chunks.push(samples);
    let total = 0;
    for (const c of this.chunks) total += c.length;
    if (total >= sampleRate * CHUNK_SECONDS && this.onChunk) {
      const merged = new Float32Array(total);
      let o = 0;
      for (const c of this.chunks) {
        merged.set(c, o);
        o += c.length;
      }
      this.chunks = [];
      this.onChunk(merged);
    }
  }
}
