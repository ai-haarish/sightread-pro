import { useEffect, useState, useCallback } from "react";
import { loadJSON, saveJSON } from "@/lib/storage";

export interface NoteStat {
  attempts: number;
  correct: number;
  totalMs: number;
}

export interface Stats {
  score: number;
  bestStreak: number;
  notesPracticed: number;
  correctCount: number;
  totalResponseMs: number;
  perNote: Record<number, NoteStat>; // midi -> stat
}

export const EMPTY_STATS: Stats = {
  score: 0,
  bestStreak: 0,
  notesPracticed: 0,
  correctCount: 0,
  totalResponseMs: 0,
  perNote: {},
};

const KEY = "sightread.stats.v1";

export function useStats() {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);

  useEffect(() => {
    setStats(loadJSON<Stats>(KEY, EMPTY_STATS));
  }, []);

  const record = useCallback(
    (midi: number, correct: boolean, responseMs: number, currentStreak: number) => {
      setStats((s) => {
        const prev = s.perNote[midi] ?? { attempts: 0, correct: 0, totalMs: 0 };
        const next: Stats = {
          ...s,
          score: correct ? s.score + Math.max(10, Math.round(1000 / Math.max(responseMs, 250))) : s.score,
          bestStreak: Math.max(s.bestStreak, currentStreak),
          notesPracticed: s.notesPracticed + 1,
          correctCount: s.correctCount + (correct ? 1 : 0),
          totalResponseMs: s.totalResponseMs + responseMs,
          perNote: {
            ...s.perNote,
            [midi]: {
              attempts: prev.attempts + 1,
              correct: prev.correct + (correct ? 1 : 0),
              totalMs: prev.totalMs + responseMs,
            },
          },
        };
        saveJSON(KEY, next);
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setStats(EMPTY_STATS);
    saveJSON(KEY, EMPTY_STATS);
  }, []);

  return { stats, record, reset };
}
