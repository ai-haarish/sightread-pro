// Music theory helpers: MIDI <-> note names, VexFlow keys, clef ranges.

export type Clef = "treble" | "bass" | "grand" | "alto" | "tenor";

export const NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export interface Note {
  midi: number;
  name: string; // e.g. "C", "F#", "Bb"
  letter: string; // C D E F G A B
  accidental: "" | "#" | "b" | "n";
  octave: number;
  vexKey: string; // e.g. "c/4", "f#/4"
  targetClef?: "treble" | "bass" | "alto" | "tenor";
}

export function midiToNote(midi: number, preferFlat = false, targetClef?: "treble" | "bass" | "alto" | "tenor"): Note {
  const normMidi = Math.round(midi);
  const noteIndex = ((normMidi % 12) + 12) % 12;
  const names = preferFlat ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  const name = names[noteIndex];
  const octave = Math.floor(normMidi / 12) - 1;
  const letter = name[0];
  const accidental = (name[1] as "#" | "b" | undefined) ?? "";
  const vexKey = `${letter.toLowerCase()}${accidental}/${octave}`;
  return {
    midi: normMidi,
    name,
    letter,
    accidental: accidental as Note["accidental"],
    octave,
    vexKey,
    targetClef,
  };
}

export function noteDisplayName(n: Note): string {
  return `${n.name}${n.octave}`;
}

// 88-key piano is A0 (21) to C8 (108)
export const PIANO_MIN = 21;
export const PIANO_MAX = 108;

// Natural staff limits (notes that sit on or immediately touch staff lines without ledger lines)
export const STAFF_LINE_LIMITS: Record<Clef, { min: number; max: number }> = {
  treble: { min: 62, max: 79 }, // D4..G5 (E4 is bottom line, F5 is top line)
  bass: { min: 41, max: 59 },   // F2..B3 (G2 is bottom line, A3 is top line)
  grand: { min: 41, max: 79 },  // F2..G5 (includes middle C between staves)
  alto: { min: 55, max: 72 },   // G3..C5
  tenor: { min: 52, max: 69 },  // E3..A4
};

// Recommended practical ranges per clef
export const CLEF_DEFAULT_RANGES: Record<Clef, { min: number; max: number }> = {
  treble: { min: 60, max: 84 }, // C4..C6
  bass: { min: 36, max: 60 },   // C2..C4
  grand: { min: 48, max: 84 },  // C3..C6
  alto: { min: 53, max: 77 },   // F3..F5
  tenor: { min: 48, max: 72 },  // C3..C5
};

export const CLEF_RANGES = CLEF_DEFAULT_RANGES;

export function isBlackKey(midi: number): boolean {
  const mod = ((midi % 12) + 12) % 12;
  return [1, 3, 6, 8, 10].includes(mod);
}

