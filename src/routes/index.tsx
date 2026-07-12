import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Music, Settings as SettingsIcon, Zap, Timer, Heart, Calendar, Sliders } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useMidi } from "@/hooks/useMidi";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const MODES = [
  { id: "endless", name: "Endless Practice", desc: "Flow forever, no pressure.", icon: Music, href: "/practice", search: { mode: "endless" } as const },
  { id: "timed", name: "Timed — 60s", desc: "How many can you nail in a minute?", icon: Timer, href: "/practice", search: { mode: "timed" } as const },
  { id: "survival", name: "Survival", desc: "Three mistakes and you're out.", icon: Heart, href: "/practice", search: { mode: "survival" } as const },
  { id: "daily", name: "Daily Challenge", desc: "A new seed every day.", icon: Calendar, href: "/practice", search: { mode: "daily" } as const },
  { id: "custom", name: "Custom", desc: "Use your saved settings.", icon: Sliders, href: "/practice", search: { mode: "endless" } as const },
] as const;

function HomePage() {
  const { supported, connected, devices, connect, error } = useMidi();
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    // Try to auto-connect if permission was already granted previously
    if (supported && !connected && !autoTried) {
      setAutoTried(true);
      connect();
    }
  }, [supported, connected, autoTried, connect]);

  return (
    <Layout>
      <section className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Read music at the speed of sight.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          SightRead Pro turns your MIDI keyboard into a sight-reading trainer. Notes appear on the staff — you play them.
          Instant feedback, streaks, and stats keep you sharp.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={connect}
            disabled={!supported}
            className="glass-card px-4 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
          >
            {connected ? "MIDI Connected" : supported ? "Connect MIDI Keyboard" : "Web MIDI not supported"}
          </button>
          <span
            className={[
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              connected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            <span className={["h-2 w-2 rounded-full", connected ? "bg-success" : "bg-muted-foreground"].join(" ")} />
            {connected ? `Connected — ${devices.map((d) => d.name).join(", ")}` : "Disconnected"}
          </span>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/practice"
            search={{ mode: "endless" }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90"
          >
            <Zap className="h-4 w-4" />
            Start Practice
          </Link>
          <Link to="/stats" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-5 py-2.5 text-sm font-medium hover:bg-accent">
            <BarChart3 className="h-4 w-4" /> Statistics
          </Link>
          <Link to="/settings" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-5 py-2.5 text-sm font-medium hover:bg-accent">
            <SettingsIcon className="h-4 w-4" /> Settings
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Game Modes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.id}
                to={m.href}
                search={m.search}
                className="glass-card group flex items-start gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-sm text-muted-foreground">{m.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </Layout>
  );
}
