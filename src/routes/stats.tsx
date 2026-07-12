import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useStats } from "@/hooks/useStats";
import { midiToNote, PIANO_MAX, PIANO_MIN } from "@/lib/music";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — SightRead Pro" },
      { name: "description", content: "Track your sight-reading progress, streaks, and most-missed notes." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { stats, reset } = useStats();
  const accuracy = stats.notesPracticed
    ? Math.round((stats.correctCount / stats.notesPracticed) * 100)
    : 0;
  const avgMs = stats.notesPracticed
    ? Math.round(stats.totalResponseMs / stats.notesPracticed)
    : 0;

  const entries = Object.entries(stats.perNote)
    .map(([midi, s]) => ({ midi: Number(midi), ...s, missRate: s.attempts ? 1 - s.correct / s.attempts : 0 }));

  const maxAttempts = entries.reduce((m, e) => Math.max(m, e.attempts), 1);

  return (
    <Layout>
      <div className="mb-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Your Progress</h1>
      <p className="text-sm text-muted-foreground">Lifetime stats, saved locally on this device.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card label="Score" value={stats.score} />
        <Card label="Accuracy" value={`${accuracy}%`} />
        <Card label="Best Streak" value={stats.bestStreak} />
        <Card label="Avg Response" value={`${avgMs} ms`} />
        <Card label="Notes Practiced" value={stats.notesPracticed} />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Heatmap — most missed notes
        </h2>
        {entries.length === 0 ? (
          <div className="glass-card p-6 text-sm text-muted-foreground">
            Play a session to build your heatmap.
          </div>
        ) : (
          <div className="glass-card p-4">
            <div className="grid grid-cols-12 gap-1 sm:grid-cols-[repeat(24,minmax(0,1fr))]">
              {Array.from({ length: PIANO_MAX - PIANO_MIN + 1 }, (_, i) => PIANO_MIN + i).map((m) => {
                const entry = entries.find((e) => e.midi === m);
                const attempts = entry?.attempts ?? 0;
                const miss = entry?.missRate ?? 0;
                const intensity = attempts / maxAttempts;
                const note = midiToNote(m);
                const bg = attempts === 0
                  ? "var(--color-muted)"
                  : `color-mix(in oklab, var(--color-destructive) ${Math.round(miss * 80 + intensity * 20)}%, var(--color-muted))`;
                return (
                  <div
                    key={m}
                    title={`${note.name}${note.octave} — ${entry?.correct ?? 0}/${attempts}`}
                    className="aspect-square rounded-md border border-border/50"
                    style={{ backgroundColor: bg }}
                  />
                );
              })}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Darker red = more misses. Hover a cell to see the note.
            </div>
          </div>
        )}
      </section>

      <div className="mt-8">
        <button
          onClick={reset}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Reset all stats
        </button>
      </div>
    </Layout>
  );
}

function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
