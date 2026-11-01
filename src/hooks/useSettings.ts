import { useEffect, useState } from "react";
import type { Clef } from "@/lib/music";
import { loadJSON, saveJSON } from "@/lib/storage";

export interface Settings {
  clef: Clef;
  ledgerLines: boolean;
  sharps: boolean;
  flats: boolean;
  naturals: boolean;
  rangeMin: number;
  rangeMax: number;
  difficulty: "easy" | "medium" | "hard" | "custom";
  nextNoteDelayMs: number;
  theme: "light" | "dark" | "system";
}

export const DEFAULT_SETTINGS: Settings = {
  clef: "grand",
  ledgerLines: true,
  sharps: true,
  flats: true,
  naturals: true,
  rangeMin: 48,
  rangeMax: 84,
  difficulty: "medium",
  nextNoteDelayMs: 300,
  theme: "system",
};

const KEY = "sightread.settings.v1";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadJSON<Settings>(KEY, DEFAULT_SETTINGS));
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveJSON(KEY, next);
      return next;
    });
  };

  const reset = () => {
    setSettings(DEFAULT_SETTINGS);
    saveJSON(KEY, DEFAULT_SETTINGS);
  };

  return { settings, update, reset };
}
