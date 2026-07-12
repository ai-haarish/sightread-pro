import { useEffect } from "react";
import { loadJSON, saveJSON } from "@/lib/storage";
import { useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "sightread.theme";

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = loadJSON<{ v: Theme }>(KEY, { v: "system" }).v;
    setThemeState(stored);
    apply(stored);
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => apply(stored);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    saveJSON(KEY, { v: t });
    apply(t);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle };
}
