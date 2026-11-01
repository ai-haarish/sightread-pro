import {
  midiToNote,
  PIANO_MIN,
  PIANO_MAX,
  STAFF_LINE_LIMITS,
  isBlackKey,
  type Note,
  type Clef,
} from "@/lib/music";
import type { Settings } from "@/hooks/useSettings";

/**
 * Build the pool of allowed MIDI notes given user settings.
 * Directly respects user rangeMin and rangeMax, accidentals, and ledgerLines settings.
 */
export function buildNotePool(settings: Settings): number[] {
  // Directly use the user's configured note range
  const rawMin = Math.max(PIANO_MIN, Math.min(settings.rangeMin, settings.rangeMax));
  const rawMax = Math.min(PIANO_MAX, Math.max(settings.rangeMin, settings.rangeMax));

  // If ledger lines are disabled, restrict within the clef's staff line limits
  let min = rawMin;
  let max = rawMax;
  if (!settings.ledgerLines) {
    const limits = STAFF_LINE_LIMITS[settings.clef] ?? { min: 41, max: 79 };
    min = Math.max(min, limits.min);
    max = Math.min(max, limits.max);
    if (min > max) {
      min = limits.min;
      max = limits.max;
    }
  }

  const pool: number[] = [];
  for (let m = min; m <= max; m++) {
    const black = isBlackKey(m);
    if (black && !settings.sharps && !settings.flats) continue;
    if (!black && !settings.naturals) continue;
    pool.push(m);
  }

  if (pool.length === 0) {
    if (settings.naturals) {
      pool.push(60);
    } else if (settings.sharps || settings.flats) {
      pool.push(61);
    } else {
      pool.push(60);
    }
  }

  return pool;
}

export function pickNote(pool: number[], avoidMidi?: number, settings?: Settings): Note {
  let midi = pool[Math.floor(Math.random() * pool.length)];
  if (avoidMidi !== undefined && pool.length > 1 && midi === avoidMidi) {
    midi = pool[(pool.indexOf(midi) + 1) % pool.length];
  }

  // Determine whether to show as flat or sharp:
  let preferFlat = false;
  if (settings) {
    if (settings.flats && !settings.sharps) {
      preferFlat = true;
    } else if (settings.flats && settings.sharps) {
      // Both sharps and flats enabled: 50% chance for each black key
      preferFlat = Math.random() < 0.5;
    }
  }

  const useFlat = preferFlat && isBlackKey(midi);

  // For Grand Staff: determine target stave
  let targetClef: "treble" | "bass" | "alto" | "tenor" | undefined;
  if (settings?.clef === "grand") {
    if (midi > 60) {
      targetClef = "treble";
    } else if (midi < 60) {
      targetClef = "bass";
    } else {
      targetClef = Math.random() < 0.5 ? "treble" : "bass";
    }
  } else if (settings?.clef) {
    targetClef = settings.clef;
  }

  return midiToNote(midi, useFlat, targetClef);
}

export function targetClefFor(settings: Settings, midi: number, note?: Note): Clef {
  if (settings.clef !== "grand") return settings.clef;
  if (note?.targetClef) return note.targetClef;
  return midi >= 60 ? "treble" : "bass";
}

