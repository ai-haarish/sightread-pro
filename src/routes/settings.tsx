import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useSettings, type Settings } from "@/hooks/useSettings";
import { midiToNote, PIANO_MAX, PIANO_MIN } from "@/lib/music";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SightRead Pro" },
      { name: "description", content: "Configure clef, note range, accidentals, and difficulty." },
    ],
  }),
  component: SettingsPage,
});

const CLEFS: { id: Settings["clef"]; label: string }[] = [
  { id: "treble", label: "Treble" },
  { id: "bass", label: "Bass" },
  { id: "grand", label: "Grand Staff" },
  { id: "alto", label: "Alto" },
  { id: "tenor", label: "Tenor" },
];

const DIFFICULTY: Settings["difficulty"][] = ["easy", "medium", "hard"];

function SettingsPage() {
  const { settings, update, reset } = useSettings();

  return (
    <Layout>
      <div className="mb-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="text-sm text-muted-foreground">Preferences save automatically.</p>

      <div className="mt-6 space-y-6">
        <Section title="Clef">
          <div className="flex flex-wrap gap-2">
            {CLEFS.map((c) => (
              <Chip
                key={c.id}
                active={settings.clef === c.id}
                onClick={() => update({ clef: c.id })}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Accidentals">
          <div className="flex flex-wrap gap-2">
            <Toggle checked={settings.sharps} onChange={(v) => update({ sharps: v })} label="Sharps (♯)" />
            <Toggle checked={settings.flats} onChange={(v) => update({ flats: v })} label="Flats (♭)" />
            <Toggle checked={settings.naturals} onChange={(v) => update({ naturals: v })} label="Naturals" />
            <Toggle checked={settings.ledgerLines} onChange={(v) => update({ ledgerLines: v })} label="Ledger lines" />
          </div>
        </Section>

        <Section title="Difficulty">
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY.map((d) => (
              <Chip key={d} active={settings.difficulty === d} onClick={() => update({ difficulty: d })}>
                {d[0].toUpperCase() + d.slice(1)}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Note range">
          <div className="grid gap-4 sm:grid-cols-2">
            <RangeInput
              label={`Lowest: ${midiToNote(settings.rangeMin).name}${midiToNote(settings.rangeMin).octave}`}
              min={PIANO_MIN}
              max={settings.rangeMax - 1}
              value={settings.rangeMin}
              onChange={(v) => update({ rangeMin: v })}
            />
            <RangeInput
              label={`Highest: ${midiToNote(settings.rangeMax).name}${midiToNote(settings.rangeMax).octave}`}
              min={settings.rangeMin + 1}
              max={PIANO_MAX}
              value={settings.rangeMax}
              onChange={(v) => update({ rangeMax: v })}
            />
          </div>
        </Section>

        <Section title="Automatic next-note delay">
          <div className="max-w-md">
            <RangeInput
              label={`${settings.nextNoteDelayMs} ms`}
              min={0}
              max={2000}
              step={50}
              value={settings.nextNoteDelayMs}
              onChange={(v) => update({ nextNoteDelayMs: v })}
            />
          </div>
        </Section>

        <div>
          <button
            onClick={reset}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-1.5 text-sm font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-accent",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      {label}
    </label>
  );
}

function RangeInput({
  label, min, max, value, onChange, step = 1,
}: { label: string; min: number; max: number; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <div className="mb-1 text-sm text-muted-foreground">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
