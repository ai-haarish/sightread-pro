import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { z } from "zod";
import { ArrowLeft, Flame, Trophy, Clock, Target, Music, Keyboard, Volume2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Staff } from "@/components/Staff";
import { Piano } from "@/components/Piano";

import { useMidi } from "@/hooks/useMidi";
import { useSettings } from "@/hooks/useSettings";
import { useStats } from "@/hooks/useStats";
import { buildNotePool, pickNote } from "@/lib/notePool";
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
  const [lastPlayedMidi, setLastPlayedMidi] = useState<number | null>(null);
  const [showPiano, setShowPiano] = useState<boolean>(true);
  const [streak, setStreak] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);

  const questionStart = useRef<number>(Date.now());
  const advanceTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const labelTimerRef = useRef<number | null>(null);

  const dailyRng = useMemo(() => {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return seededRandom(seed);
  }, []);

  const pool = useMemo(() => buildNotePool(settings), [settings]);

  // Clean up all pending timers on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (labelTimerRef.current) window.clearTimeout(labelTimerRef.current);
    };
  }, []);

  const nextNote = useCallback(
    (avoid?: number) => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      setLastPlayedMidi(null);
      if (mode === "daily") {
        const midi = pool[Math.floor(dailyRng() * pool.length)];
        const preferFlat = settings.flats && !settings.sharps;
        setNote(midiToNote(midi, preferFlat));
      } else {
        setNote(pickNote(pool, avoid, settings));
      }
      questionStart.current = Date.now();
    },
    [pool, mode, dailyRng, settings],
  );

  // Initial note generation + on pool/settings change
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
      setLastPlayedMidi(midi);

      record(note.midi, correct, responseMs, correct ? streak + 1 : streak);
      setSessionTotal((n) => n + 1);

      // Clear existing flash/label timers
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (labelTimerRef.current) window.clearTimeout(labelTimerRef.current);

      if (correct) {
        playMidiNote(note.midi);
        setFlash("correct");
        setShowLabel(null);
        setStreak((s) => s + 1);
        setSessionCorrect((n) => n + 1);

        flashTimerRef.current = window.setTimeout(() => setFlash(null), 400);

        if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = window.setTimeout(() => {
          nextNote(note.midi);
        }, settings.nextNoteDelayMs);
      } else {
        playError();
        setFlash("wrong");
        setStreak(0);
        const playedNote = midiToNote(midi);
        setShowLabel(`Played: ${playedNote.name}${playedNote.octave} · Expected: ${noteDisplayName(note)}`);

        flashTimerRef.current = window.setTimeout(() => setFlash(null), 450);
        labelTimerRef.current = window.setTimeout(() => setShowLabel(null), 1800);

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

  // Auto connect MIDI when practice page mounts
  useEffect(() => {
    if (midi.supported && !midi.connected) {
      midi.connect();
    }
  }, [midi.supported, midi.connected, midi.connect]);

  // Optional keyboard shortcuts: typing A-G on computer keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      if (!note || gameOver) return;
      if (["C", "D", "E", "F", "G", "A", "B"].includes(key)) {
        // Find matching note in the current target's octave
        const targetOctave = note.octave;
        const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const semitone = noteNames.indexOf(key);
        if (semitone !== -1) {
          const playedMidi = (targetOctave + 1) * 12 + semitone;
          handleNoteOn(playedMidi);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [note, gameOver, handleNoteOn]);

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPiano((p) => !p)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition",
              showPiano ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent",
            ].join(" ")}
            title="Toggle piano keyboard display"
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Piano</span>
          </button>

          <span
            className={[
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              midi.connected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            <span className={["h-2 w-2 rounded-full", midi.connected ? "bg-success" : "bg-muted-foreground"].join(" ")} />
            {midi.connected ? "MIDI Ready" : (
              <button onClick={midi.connect} className="underline decoration-dotted">Connect MIDI</button>
            )}
          </span>
        </div>
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="uppercase tracking-wider">
            Clef: <span className="font-semibold text-foreground capitalize">{settings.clef}</span>
          </span>
          <span>•</span>
          <span className="uppercase tracking-wider">
            Mode: <span className="font-semibold text-foreground">{mode}</span>
          </span>
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

      {/* Sheet Music Staff Container */}
      <div className="glass-card p-4 sm:p-8">
        {note && (
          <Staff clef={settings.clef} note={note} flashState={flash} showCorrectLabel={showLabel} />
        )}
      </div>

      {/* Interactive Piano Keyboard */}
      {showPiano && (
        <div className="mt-4 glass-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
            <span className="font-medium flex items-center gap-1.5 uppercase tracking-wider">
              <Music className="h-3.5 w-3.5 text-primary" /> Piano Keyboard
            </span>
            <span>
              {midi.connected
                ? "Keys respond to your MIDI keyboard"
                : "Click keys on-screen or play with MIDI"}
            </span>
          </div>
          <Piano
            pressed={midi.pressed}
            target={note?.midi}
            lastPlayed={lastPlayedMidi}
            lastResult={flash}
            rangeMin={settings.rangeMin}
            rangeMax={settings.rangeMax}
            onPlayNote={handleNoteOn}
          />
        </div>
      )}

      {!midi.connected && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-4 text-xs sm:text-sm text-muted-foreground">
          <div>
            Connect your piano via USB / MIDI cable for the real sight-reading experience. You can also click keys or press letter keys (C, D, E, F, G, A, B) on your computer keyboard!
          </div>
          <button
            onClick={midi.connect}
            className="shrink-0 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 font-medium text-primary hover:bg-primary/20 transition"
          >
            Connect MIDI Keyboard
          </button>
        </div>
      )}

      {gameOver && (
        <div className="mt-6 glass-card p-6 text-center animate-in fade-in zoom-in-95">
          <div className="text-xl font-bold">Session Complete</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {sessionCorrect} of {sessionTotal} correct · {accuracy}% accuracy · best streak {stats.bestStreak}
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={restartSession}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition"
            >
              Play again
            </button>
            <Link to="/stats" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-accent transition">
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

