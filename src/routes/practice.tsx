import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { z } from "zod";
import { ArrowLeft, Flame, Trophy, Clock, Target } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Staff } from "@/components/Staff";

import { useMidi } from "@/hooks/useMidi";
import { useSettings } from "@/hooks/useSettings";
import { useStats } from "@/hooks/useStats";
import { buildNotePool, pickNote, targetClefFor } from "@/lib/notePool";
import { midiToNote, noteDisplayName, type Note } from "@/lib/music";
import { playMidiNote, playError } from "@/lib/audio";

const searchSchema = z.object({
  mode: z.enum(["endless", "timed", "survival", "daily"]).catch("endless"),
});

export const Route = createFileRoute("/practice")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Practice — SightRead Pro" },
      { name: "description", content: "Sight-read notes on the staff with instant MIDI feedback." },
    ],
  }),
  component: PracticePage,
});

// Deterministic daily seed based on today's date.
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function PracticePage() {
  const { mode } = Route.useSearch();
  const { settings } = useSettings();
  const { stats, record, reset } = useStats();
  const [note, setNote] = useState<Note | null>(null);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [showLabel, setShowLabel] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const questionStart = useRef<number>(Date.now());
  const dailyRng = useMemo(() => {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return seededRandom(seed);
  }, []);

  const pool = useMemo(() => buildNotePool(settings), [settings]);

  const nextNote = useCallback(
    (avoid?: number) => {
      const preferFlat = settings.flats && !settings.sharps;
      if (mode === "daily") {
        const midi = pool[Math.floor(dailyRng() * pool.length)];
        setNote(midiToNote(midi, preferFlat));
      } else {
        setNote(pickNote(pool, avoid, preferFlat));
      }
      questionStart.current = Date.now();
    },
    [pool, mode, dailyRng, settings.flats, settings.sharps],
  );

  // Initial + on settings change
  useEffect(() => {
    if (!gameOver) nextNote();
  }, [nextNote, gameOver]);

  // Timed mode countdown
  useEffect(() => {
    if (mode !== "timed" || gameOver) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameOver(true);
          window.clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [mode, gameOver]);

  const handleNoteOn = useCallback(
    (midi: number) => {
      if (!note || gameOver) return;
      const responseMs = Date.now() - questionStart.current;
      const correct = midi === note.midi;
      record(note.midi, correct, responseMs, correct ? streak + 1 : streak);
      setSessionTotal((n) => n + 1);
      if (correct) {
        playMidiNote(note.midi);
        setFlash("correct");
        setStreak((s) => s + 1);
        setSessionCorrect((n) => n + 1);
        window.setTimeout(() => setFlash(null), 350);
        const advance = window.setTimeout(() => nextNote(note.midi), settings.nextNoteDelayMs);
        return () => window.clearTimeout(advance);
      } else {
        playError();
        setFlash("wrong");
        setStreak(0);
        setShowLabel(noteDisplayName(note));
        window.setTimeout(() => setFlash(null), 350);
        window.setTimeout(() => setShowLabel(null), 1000);
        setMistakes((m) => {
          const next = m + 1;
          if (mode === "survival" && next >= 3) setGameOver(true);
          return next;
        });
      }
    },
    [note, record, streak, nextNote, settings.nextNoteDelayMs, mode, gameOver],
  );

  const midi = useMidi({ onNoteOn: handleNoteOn });

  const clef = note ? targetClefFor(settings, note.midi) : settings.clef === "grand" ? "treble" : settings.clef;
  const accuracy = sessionTotal ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;

  const restartSession = () => {
    setStreak(0);
    setSessionCorrect(0);
    setSessionTotal(0);
    setMistakes(0);
    setTimeLeft(60);
    setGameOver(false);
    nextNote();
  };

  return (
    <Layout
      right={
        <span
          className={[
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
            midi.connected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          <span className={["h-2 w-2 rounded-full", midi.connected ? "bg-success" : "bg-muted-foreground"].join(" ")} />
          {midi.connected ? "MIDI" : (
            <button onClick={midi.connect} className="underline decoration-dotted">Connect MIDI</button>
          )}
        </span>
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Mode: <span className="text-foreground">{mode}</span>
        </div>
      </div>

      {/* Stat pills */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={<Trophy className="h-4 w-4" />} label="Score" value={stats.score} />
        <Stat icon={<Flame className="h-4 w-4" />} label="Streak" value={streak} />
        <Stat icon={<Target className="h-4 w-4" />} label="Accuracy" value={`${accuracy}%`} />
        <Stat
          icon={<Clock className="h-4 w-4" />}
          label={mode === "timed" ? "Time" : mode === "survival" ? "Mistakes" : "Session"}
          value={mode === "timed" ? `${timeLeft}s` : mode === "survival" ? `${mistakes}/3` : sessionTotal}
        />
      </div>

      <div className="glass-card p-4 sm:p-8">
        {note && (
          <Staff clef={clef} note={note} flashState={flash} showCorrectLabel={showLabel} />
        )}
      </div>

      <div className="mt-6">
        <Piano pressed={midi.pressed} target={note?.midi} />
      </div>

      {!midi.connected && (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
          Connect a MIDI keyboard to start playing.{" "}
          <button onClick={midi.connect} className="font-medium text-primary underline-offset-2 hover:underline">
            Connect now
          </button>
        </div>
      )}

      {gameOver && (
        <div className="mt-6 glass-card p-6 text-center">
          <div className="text-lg font-semibold">Session complete</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {sessionCorrect}/{sessionTotal} correct · {accuracy}% accuracy · best streak {stats.bestStreak}
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={restartSession}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Play again
            </button>
            <Link to="/stats" className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent">
              View stats
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-muted-foreground">
        <button onClick={reset} className="underline decoration-dotted hover:text-foreground">
          Reset lifetime stats
        </button>
      </div>
    </Layout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="glass-card flex items-center gap-3 px-4 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <div className="min-w-0">
        <div className="truncate text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}
