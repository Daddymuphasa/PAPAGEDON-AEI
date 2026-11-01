/**
 * Port of engine/experience/ExperienceGraph.cpp (PAPAGEDON-CORE-, commit 4551dc4).
 * Maps ExperienceSignals to a one-frame event, a sustained state and a mood
 * (warmth 0..1) that tints the shaders through uMood.
 */
import type { ExperienceSignals } from "./analyzer";

export type ExperienceEvent = "Beat" | "BuildUp" | "Drop" | "Calm" | "Silence";
export type ExperienceState = "Calm" | "BuildUp" | "Drop" | "Silence" | "Ambient";

export type ExperienceGraphOutput = {
  event: ExperienceEvent;
  state: ExperienceState;
  mood: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export class ExperienceGraph {
  private previousEnergy = 0;

  update(signals: ExperienceSignals): ExperienceGraphOutput {
    const event = resolveEvent(signals, this.previousEnergy);
    const state = resolveState(event);
    const mood = resolveMood(state, signals.tension);
    this.previousEnergy = signals.energy;
    return { event, state, mood };
  }
}

function resolveEvent(signals: ExperienceSignals, previousEnergy: number): ExperienceEvent {
  if (signals.energy < 0.05) return "Silence";
  if (signals.energy >= 0.7) return "Drop";
  if (signals.beat) return "Beat";
  const delta = signals.energy - previousEnergy;
  if (signals.energy >= 0.4 && delta >= 0.02) return "BuildUp";
  return "Calm";
}

function resolveState(event: ExperienceEvent): ExperienceState {
  switch (event) {
    case "Drop":
      return "Drop";
    case "BuildUp":
      return "BuildUp";
    case "Calm":
    case "Beat":
      return "Calm";
    case "Silence":
      return "Silence";
  }
}

function resolveMood(state: ExperienceState, tension: number): number {
  const base = { Drop: 0.9, BuildUp: 0.7, Calm: 0.35, Silence: 0.1, Ambient: 0.4 }[state];
  return clamp(base + tension * 0.25, 0, 1);
}
