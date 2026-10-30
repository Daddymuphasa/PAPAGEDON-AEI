// M5 track map: verifies Modal pre-analysis JSON, finds upcoming section
// changes, and builds a deterministic mock map. Pure: Node-safe and
// unit-tested. Sections must tile 0..durationS with no gaps or overlaps.
import type { SectionKind, TrackMap, TrackSection, UpcomingChange } from '../types';

export const MAP_BPM_MIN = 40;
export const MAP_BPM_MAX = 220;
export const MAP_ENERGY_MIN = 0;
export const MAP_ENERGY_MAX = 1;
export const MAP_SECTION_KINDS: SectionKind[] = ['intro', 'build', 'drop', 'breakdown', 'outro'];
export const MAP_COVER_TOL_S = 0.01; // float slack for tiling checks

export interface MapVerifyResult {
  ok: boolean;
  errors: string[];
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function checkTimeSeries(arr: unknown, name: string, max: number, errors: string[]): void {
  if (!Array.isArray(arr)) {
    errors.push(`${name} must be an array`);
    return;
  }
  let prev = -Infinity;
  arr.forEach((v: unknown, i: number) => {
    if (!isNum(v) || v < 0 || v > max) {
      errors.push(`${name}[${i}] out of range 0-${max}`);
      return;
    }
    if (v <= prev) errors.push(`${name} must be strictly increasing (index ${i})`);
    prev = v;
  });
}

export function verifyTrackMap(raw: unknown): MapVerifyResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: ['map is not an object'] };
  }
  const m = raw as Record<string, unknown>;
  const dur = m.durationS;
  if (!isNum(dur) || dur <= 0) errors.push('durationS must be a positive number');
  const durationS = isNum(dur) && dur > 0 ? dur : 0;
  const bpm = m.bpm;
  if (!isNum(bpm) || bpm < MAP_BPM_MIN || bpm > MAP_BPM_MAX) {
    errors.push(`bpm must be ${MAP_BPM_MIN}-${MAP_BPM_MAX}`);
  }
  checkTimeSeries(m.beats, 'beats', durationS, errors);
  checkTimeSeries(m.downbeats, 'downbeats', durationS, errors);
  if (!Array.isArray(m.energy)) {
    errors.push('energy must be an array');
  } else {
    let prevT = -Infinity;
    m.energy.forEach((p: unknown, i: number) => {
      const pt = (typeof p === 'object' && p !== null ? p : {}) as Record<string, unknown>;
      if (!isNum(pt.t) || pt.t < 0 || pt.t > durationS) {
        errors.push(`energy[${i}].t out of range 0-${durationS}`);
        return;
      }
      if (!isNum(pt.v) || pt.v < MAP_ENERGY_MIN || pt.v > MAP_ENERGY_MAX) {
        errors.push(`energy[${i}].v must be ${MAP_ENERGY_MIN}-${MAP_ENERGY_MAX}`);
        return;
      }
      if (pt.t <= prevT) errors.push(`energy.t must be strictly increasing (index ${i})`);
      prevT = pt.t;
    });
  }
  if (!Array.isArray(m.sections) || m.sections.length === 0) {
    errors.push('sections must be a non-empty array');
  } else {
    let expectStart = 0;
    m.sections.forEach((s: unknown, i: number) => {
      if (typeof s !== 'object' || s === null) {
        errors.push(`sections[${i}] is not an object`);
        return;
      }
      const sec = s as Record<string, unknown>;
      if (typeof sec.kind !== 'string' || !MAP_SECTION_KINDS.includes(sec.kind as SectionKind)) {
        errors.push(`sections[${i}].kind must be one of ${MAP_SECTION_KINDS.join(', ')}`);
      }
      const start = sec.start;
      const end = sec.end;
      if (!isNum(start) || !isNum(end) || end <= start) {
        errors.push(`sections[${i}] must have numeric start < end`);
        return;
      }
      if (Math.abs(start - expectStart) > MAP_COVER_TOL_S) {
        errors.push(`sections[${i}] must start where the previous section ends`);
      }
      if (start < 0 || end > durationS + MAP_COVER_TOL_S) {
        errors.push(`sections[${i}] out of range 0-${durationS}`);
      }
      expectStart = end;
    });
    if (durationS > 0 && Math.abs(expectStart - durationS) > MAP_COVER_TOL_S) {
      errors.push('sections must cover 0..durationS');
    }
  }
  return { ok: errors.length === 0, errors };
}

// Next section boundary within lookaheadS, or null when the map holds
// steady that far (or the track is over). Sections must be start-sorted,
// which verifyTrackMap guarantees.
export function upcoming(sections: TrackSection[], now: number, lookaheadS: number): UpcomingChange | null {
  if (sections.length === 0 || lookaheadS < 0) return null;
  let idx = -1;
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].start <= now) idx = i;
    else break;
  }
  const next = sections[idx + 1];
  if (!next) return null;
  const inS = next.start - now;
  if (inS > lookaheadS) return null;
  return { at: next.start, from: idx >= 0 ? sections[idx].kind : next.kind, to: next.kind, inS: Math.max(0, inS) };
}

// Next `count` section changes within horizonS (for planner context).
export function upcomingList(
  sections: TrackSection[],
  now: number,
  count: number,
  horizonS: number,
): UpcomingChange[] {
  const out: UpcomingChange[] = [];
  let cursor = now;
  for (let i = 0; i < count; i++) {
    const next = upcoming(sections, cursor, horizonS - (cursor - now));
    if (!next) break;
    out.push({ ...next, inS: next.at - now });
    cursor = next.at + 0.001;
  }
  return out;
}

// Deterministic fake map (no Modal, no randomness): 120s with two drops.
// The mock show clock runs past durationS; callers clamp and go live-only.
export function mockTrackMap(): TrackMap {
  const durationS = 120;
  const bpm = 126;
  const sections: TrackSection[] = [
    { start: 0, end: 16, kind: 'intro' },
    { start: 16, end: 32, kind: 'build' },
    { start: 32, end: 64, kind: 'drop' },
    { start: 64, end: 80, kind: 'breakdown' },
    { start: 80, end: 96, kind: 'build' },
    { start: 96, end: 112, kind: 'drop' },
    { start: 112, end: 120, kind: 'outro' },
  ];
  const step = 60 / bpm;
  const beats: number[] = [];
  for (let t = 0; t <= durationS; t += step) beats.push(Math.round(t * 1000) / 1000);
  const downbeats = beats.filter((_, i) => i % 4 === 0);
  const base: Record<SectionKind, number> = { intro: 0.2, build: 0.5, drop: 0.85, breakdown: 0.25, outro: 0.15 };
  const energy: TrackMap['energy'] = [];
  for (let i = 0; i * 0.5 <= durationS; i++) {
    const t = i * 0.5;
    const sec = sections.find((s) => t < s.end) ?? sections[sections.length - 1];
    const v = Math.min(1, Math.max(0, base[sec.kind] + 0.04 * Math.sin(i * 0.7)));
    energy.push({ t, v: Math.round(v * 10000) / 10000 });
  }
  return { durationS, bpm, beats, downbeats, energy, sections };
}
