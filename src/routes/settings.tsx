import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useSettings, type Settings } from "@/hooks/useSettings";
import {
  midiToNote,
  PIANO_MAX,
  PIANO_MIN,
  CLEF_DEFAULT_RANGES,
  STAFF_LINE_LIMITS,
  type Clef,
} from "@/lib/music";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SightRead Pro" },
      { name: "description", content: "Configure clef, note range, accidentals, and difficulty." },
    ],
  }),
  component: SettingsPage,
});

const CLEFS: { id: Settings["clef"]; label: string; desc: string }[] = [
  { id: "grand", label: "Grand Staff", desc: "Both Treble & Bass (Standard Piano)" },
  { id: "treble", label: "Treble", desc: "Right Hand (G Clef)" },
  { id: "bass", label: "Bass", desc: "Left Hand (F Clef)" },
  { id: "alto", label: "Alto", desc: "C Clef on 3rd line" },
  { id: "tenor", label: "Tenor", desc: "C Clef on 4th line" },
];

interface RangePreset {
  label: string;
  min: number;
  max: number;
}

const COMMON_PRESETS: RangePreset[] = [
  { label: "Middle C (C4)", min: 60, max: 60 },
  { label: "Treble Staff (C4–G5)", min: 60, max: 79 },
  { label: "Bass Staff (F2–C4)", min: 41, max: 60 },
  { label: "Grand Staff (C3–C5)", min: 48, max: 72 },
  { label: "Wide Piano (C2–C6)", min: 36, max: 84 },
  { label: "Full 88 Keys (A0–C8)", min: 21, max: 108 },
];

function SettingsPage() {
  const { settings, update, reset } = useSettings();

  const handleDifficulty = (diff: "easy" | "medium" | "hard") => {
    if (diff === "easy") {
      const def =
        settings.clef === "treble"
          ? { min: 60, max: 76 }
          : settings.clef === "bass"
            ? { min: 48, max: 60 }
            : { min: 48, max: 72 };
      update({
        difficulty: "easy",
        rangeMin: def.min,
        rangeMax: def.max,
        sharps: false,
        flats: false,
        naturals: true,
        ledgerLines: false,
      });
    } else if (diff === "medium") {
      const def =
        settings.clef === "treble"
          ? { min: 60, max: 84 }
          : settings.clef === "bass"
            ? { min: 36, max: 60 }
            : { min: 48, max: 84 };
      update({
        difficulty: "medium",
        rangeMin: def.min,
        rangeMax: def.max,
        sharps: true,
        flats: true,
        naturals: true,
        ledgerLines: true,
      });
    } else {
      update({
        difficulty: "hard",
        rangeMin: PIANO_MIN,
        rangeMax: PIANO_MAX,
        sharps: true,
        flats: true,
        naturals: true,
        ledgerLines: true,
      });
    }
  };

  const handleClefChange = (clef: Clef) => {
    const range = CLEF_DEFAULT_RANGES[clef] ?? { min: 48, max: 84 };
    update({
      clef,
      rangeMin: range.min,
      rangeMax: range.max,
    });
  };

  const handleRangeMin = (val: number) => {
    const nextMin = Math.max(PIANO_MIN, Math.min(val, settings.rangeMax));
    update({ rangeMin: nextMin, difficulty: "custom" });
  };

  const handleRangeMax = (val: number) => {
    const nextMax = Math.min(PIANO_MAX, Math.max(val, settings.rangeMin));
    update({ rangeMax: nextMax, difficulty: "custom" });
  };

  const applyPreset = (preset: RangePreset) => {
    update({
      rangeMin: preset.min,
      rangeMax: preset.max,
      difficulty: "custom",
    });
  };

  const lowNote = midiToNote(settings.rangeMin);
  const highNote = midiToNote(settings.rangeMax);
  const totalPianoKeys = PIANO_MAX - PIANO_MIN + 1; // 88
  const rangeLeftPct = ((settings.rangeMin - PIANO_MIN) / totalPianoKeys) * 100;
  const rangeWidthPct = Math.max(2, ((settings.rangeMax - settings.rangeMin + 1) / totalPianoKeys) * 100);

  return (
    <Layout>
      <div className="mb-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
          <p className="text-sm text-muted-foreground">Customize note generation, key range, accidentals, and delay.</p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium hover:bg-accent transition"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset defaults
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {/* Clef Selection */}
        <Section title="Clef & Staff">
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {CLEFS.map((c) => (
              <button
                key={c.id}
                onClick={() => handleClefChange(c.id)}
                className={[
                  "rounded-2xl border p-3.5 text-left transition-all",
                  settings.clef === c.id
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                    : "border-border bg-card hover:bg-accent",
                ].join(" ")}
              >
                <div className="font-semibold text-sm">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.desc}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* Note Range Section */}
        <Section title="Note Range (Keys Allowed)">
          <div className="space-y-4">
            {/* Visual Piano Range Bar */}
            <div className="rounded-xl border border-border bg-card/60 p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Piano Range: A0 (Lowest)</span>
                <span className="font-semibold text-foreground">
                  {settings.rangeMax - settings.rangeMin + 1} Keys ({lowNote.name}{lowNote.octave} to {highNote.name}{highNote.octave})
                </span>
                <span>C8 (Highest)</span>
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
                {/* Active range highlight */}
                <div
                  className="absolute top-0 bottom-0 rounded-full bg-primary transition-all duration-150"
                  style={{
                    left: `${rangeLeftPct}%`,
                    width: `${rangeWidthPct}%`,
                  }}
                />
              </div>
            </div>

            {/* Sliders and Steppers */}
            <div className="grid gap-4 sm:grid-cols-2">
              <NoteStepper
                label="Lowest Note"
                midi={settings.rangeMin}
                min={PIANO_MIN}
                max={settings.rangeMax}
                onChange={handleRangeMin}
              />
              <NoteStepper
                label="Highest Note"
                midi={settings.rangeMax}
                min={settings.rangeMin}
                max={PIANO_MAX}
                onChange={handleRangeMax}
              />
            </div>

            {/* Quick Range Presets */}
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Quick Range Presets:</div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PRESETS.map((p) => {
                  const isActive = settings.rangeMin === p.min && settings.rangeMax === p.max;
                  return (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p)}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card/70 hover:bg-accent",
                      ].join(" ")}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* Difficulty Presets */}
        <Section title="Difficulty Presets">
          <div className="flex flex-wrap items-center gap-2">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <Chip
                key={d}
                active={settings.difficulty === d}
                onClick={() => handleDifficulty(d)}
              >
                {d === "easy" && "Easy (Beginner: No Accidentals, Small Range)"}
                {d === "medium" && "Medium (Standard Range & Accidentals)"}
                {d === "hard" && "Hard (Full Piano & Extended Ledgers)"}
              </Chip>
            ))}
            {settings.difficulty === "custom" && (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
                Custom Configuration
              </span>
            )}
          </div>
        </Section>

        {/* Accidentals & Ledger Lines */}
        <Section title="Accidentals & Ledger Lines">
          <div className="flex flex-wrap gap-2">
            <Toggle
              checked={settings.sharps}
              onChange={(v) => update({ sharps: v, difficulty: "custom" })}
              label="Sharps (♯)"
            />
            <Toggle
              checked={settings.flats}
              onChange={(v) => update({ flats: v, difficulty: "custom" })}
              label="Flats (♭)"
            />
            <Toggle
              checked={settings.naturals}
              onChange={(v) => update({ naturals: v, difficulty: "custom" })}
              label="Naturals (♮)"
            />
            <Toggle
              checked={settings.ledgerLines}
              onChange={(v) => update({ ledgerLines: v, difficulty: "custom" })}
              label="Allow Ledger Lines"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {settings.sharps && settings.flats
              ? "Both sharps and flats will appear randomly on black keys."
              : settings.sharps
                ? "Black keys will display as sharps."
                : settings.flats
                  ? "Black keys will display as flats."
                  : "Accidentals disabled (only naturals)."}
            {!settings.ledgerLines && " Ledger lines disabled: notes constrained to within the staff lines."}
          </p>
        </Section>

        {/* Delay after correct answer */}
        <Section title="Next Note Transition Delay">
          <div className="max-w-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delay after correct key:</span>
              <span className="font-semibold">{settings.nextNoteDelayMs} ms</span>
            </div>
            <input
              type="range"
              min={0}
              max={1500}
              step={50}
              value={settings.nextNoteDelayMs}
              onChange={(e) => update({ nextNoteDelayMs: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Instant (0 ms)</span>
              <span>Fast (300 ms)</span>
              <span>Relaxed (1000 ms)</span>
            </div>
          </div>
        </Section>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-xs font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "border-border bg-card hover:bg-accent",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium hover:bg-accent transition">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-primary"
      />
      {label}
    </label>
  );
}

function NoteStepper({
  label,
  midi,
  min,
  max,
  onChange,
}: {
  label: string;
  midi: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const note = midiToNote(midi);
  const isMiddleC = midi === 60;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-primary">MIDI {midi}</span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          disabled={midi <= min}
          onClick={() => onChange(midi - 1)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-accent disabled:opacity-30"
          title="Lower by half-step"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <div className="text-2xl font-bold tracking-tight">
            {note.name}
            <span className="text-primary">{note.octave}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {isMiddleC ? "Middle C" : midi < 60 ? `${Math.round((60 - midi) / 12 * 10) / 10} oct below Mid C` : `${Math.round((midi - 60) / 12 * 10) / 10} oct above Mid C`}
          </div>
        </div>

        <button
          type="button"
          disabled={midi >= max}
          onClick={() => onChange(midi + 1)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-accent disabled:opacity-30"
          title="Raise by half-step"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <input
        type="range"
        min={PIANO_MIN}
        max={PIANO_MAX}
        value={midi}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

