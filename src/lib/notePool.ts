import { midiToNote, CLEF_RANGES, type Note, type Clef, isBlackKey } from "@/lib/music";
import type { Settings } from "@/hooks/useSettings";

/**
 * Build the pool of allowed MIDI notes given user settings.
 * Applies clef range, user range clamp, and accidental preferences.
 */
export function buildNotePool(settings: Settings): number[] {
  const clef = settings.clef;
  let min: number;
  let max: number;
  if (clef === "grand") {
    min = CLEF_RANGES.bass.min;
    max = CLEF_RANGES.treble.max;
  } else {
    min = CLEF_RANGES[clef].min;
    max = CLEF_RANGES[clef].max;
  }
  // Difficulty narrows the range around middle C
  if (settings.difficulty === "easy") {
    min = Math.max(min, 55);
    max = Math.min(max, 72);
  } else if (settings.difficulty === "medium") {
    min = Math.max(min, 48);
    max = Math.min(max, 79);
  }
  min = Math.max(min, settings.rangeMin);
  max = Math.min(max, settings.rangeMax);

  const pool: number[] = [];
  for (let m = min; m <= max; m++) {
    const black = isBlackKey(m);
    if (black && !settings.sharps && !settings.flats) continue;
    if (!black && !settings.naturals) continue;
    pool.push(m);
  }
  return pool.length > 0 ? pool : [60];
}

export function pickNote(pool: number[], avoidMidi?: number, preferFlat = false): Note {
  let midi = pool[Math.floor(Math.random() * pool.length)];
  if (avoidMidi !== undefined && pool.length > 1 && midi === avoidMidi) {
    midi = pool[(pool.indexOf(midi) + 1) % pool.length];
  }
  const useFlat = preferFlat && isBlackKey(midi);
  return midiToNote(midi, useFlat);
}

export function targetClefFor(settings: Settings, midi: number): Clef {
  if (settings.clef !== "grand") return settings.clef;
  return midi >= 60 ? "treble" : "bass";
}
