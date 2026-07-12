import { Link } from "@tanstack/react-router";
import { Moon, Sun, Music2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";

interface LayoutProps {
  children: ReactNode;
  right?: ReactNode;
}

export function Layout({ children, right }: LayoutProps) {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-background">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Music2 className="h-4 w-4" />
            </span>
            <span>SightRead <span className="text-muted-foreground">Pro</span></span>
          </Link>
          <div className="flex items-center gap-2">
            {right}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70 text-foreground transition hover:bg-accent"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
