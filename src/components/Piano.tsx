import { PIANO_MAX, PIANO_MIN, isBlackKey, midiToNote } from "@/lib/music";

interface PianoProps {
  pressed: Set<number>;
  target?: number;
}

/**
 * 88-key piano visualization (A0..C8). Highlights pressed keys and the target note.
 * Responsive: scales horizontally to fill the container.
 */
export function Piano({ pressed, target }: PianoProps) {
  const whiteKeys: number[] = [];
  for (let m = PIANO_MIN; m <= PIANO_MAX; m++) if (!isBlackKey(m)) whiteKeys.push(m);
  const whiteCount = whiteKeys.length; // 52

  const whiteIndex = (midi: number) => {
    // Find index of nearest white key at or below `midi`
    let idx = whiteKeys.indexOf(midi);
    if (idx !== -1) return idx;
    // Black key: it sits between whiteKeys[i] and whiteKeys[i+1]
    for (let i = 0; i < whiteKeys.length - 1; i++) {
      if (whiteKeys[i] < midi && whiteKeys[i + 1] > midi) return i;
    }
    return 0;
  };

  return (
    <div className="w-full">
      <div className="relative mx-auto aspect-[8/1] w-full min-h-16 max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* White keys */}
        <div className="flex h-full w-full">
          {whiteKeys.map((m) => {
            const isPressed = pressed.has(m);
            const isTarget = target === m;
            return (
              <div
                key={m}
                className={[
                  "flex-1 border-r border-border last:border-r-0 transition-colors",
                  isPressed ? "bg-primary/70" : isTarget ? "bg-primary/20" : "bg-white dark:bg-neutral-100",
                ].join(" ")}
                title={midiToNote(m).name + midiToNote(m).octave}
              />
            );
          })}
        </div>
        {/* Black keys */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: PIANO_MAX - PIANO_MIN + 1 }, (_, i) => PIANO_MIN + i)
            .filter(isBlackKey)
            .map((m) => {
              const wi = whiteIndex(m);
              // position centered between white keys wi and wi+1
              const leftPct = ((wi + 1) / whiteCount) * 100;
              const widthPct = (1 / whiteCount) * 100 * 0.62;
              const isPressed = pressed.has(m);
              const isTarget = target === m;
              return (
                <div
                  key={m}
                  className={[
                    "absolute top-0 h-[62%] -translate-x-1/2 rounded-b-md border border-black/60 transition-colors",
                    isPressed
                      ? "bg-primary"
                      : isTarget
                        ? "bg-primary/70"
                        : "bg-neutral-900",
                  ].join(" ")}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
