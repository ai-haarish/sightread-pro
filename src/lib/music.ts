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
}

export function midiToNote(midi: number, preferFlat = false): Note {
  const names = preferFlat ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  const name = names[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  const letter = name[0];
  const accidental = (name[1] as "#" | "b" | undefined) ?? "";
  const vexKey = `${letter.toLowerCase()}${accidental}/${octave}`;
  return { midi, name, letter, accidental: accidental as Note["accidental"], octave, vexKey };
}

export function noteDisplayName(n: Note): string {
  return `${n.name}${n.octave}`;
}

// MIDI ranges per clef (roughly practical staff ranges incl. modest ledger use)
export const CLEF_RANGES: Record<Exclude<Clef, "grand">, { min: number; max: number }> = {
  treble: { min: 60, max: 84 }, // C4..C6
  bass: { min: 40, max: 64 }, // E2..E4
  alto: { min: 53, max: 77 }, // F3..F5
  tenor: { min: 48, max: 72 }, // C3..C5
};

// 88-key piano is A0 (21) to C8 (108)
export const PIANO_MIN = 21;
export const PIANO_MAX = 108;

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}
