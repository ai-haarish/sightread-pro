import { PIANO_MAX, PIANO_MIN, isBlackKey, midiToNote } from "@/lib/music";

interface PianoProps {
  pressed: Set<number>;
  target?: number;
  lastPlayed?: number | null;
  lastResult?: "correct" | "wrong" | null;
  rangeMin?: number;
  rangeMax?: number;
  onPlayNote?: (midi: number) => void;
}

/**
 * 88-key piano visualization (A0..C8). Highlights pressed keys, target note,
 * and active range. Keys can also be clicked or tapped to practice without MIDI.
 */
export function Piano({
  pressed,
  target,
  lastPlayed,
  lastResult,
  rangeMin = PIANO_MIN,
  rangeMax = PIANO_MAX,
  onPlayNote,
}: PianoProps) {
  const whiteKeys: number[] = [];
  for (let m = PIANO_MIN; m <= PIANO_MAX; m++) if (!isBlackKey(m)) whiteKeys.push(m);
  const whiteCount = whiteKeys.length; // 52

  const whiteIndex = (midi: number) => {
    const idx = whiteKeys.indexOf(midi);
    if (idx !== -1) return idx;
    for (let i = 0; i < whiteKeys.length - 1; i++) {
      if (whiteKeys[i] < midi && whiteKeys[i + 1] > midi) return i;
    }
    return 0;
  };

  const getKeyFeedback = (m: number) => {
    const isCurrentlyPressed = pressed.has(m);
    const wasJustPlayed = lastPlayed === m;
    const isTarget = target === m;

    if (isCurrentlyPressed || wasJustPlayed) {
      if (lastResult === "wrong" && wasJustPlayed) return "wrong";
      if (isTarget) return "correct";
      return "pressed";
    }
    return "idle";
  };

  return (
    <div className="w-full select-none">
      <div className="relative mx-auto aspect-[10/1] w-full min-h-20 max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-inner">
        {/* White keys */}
        <div className="flex h-full w-full">
          {whiteKeys.map((m) => {
            const feedback = getKeyFeedback(m);
            const inRange = m >= rangeMin && m <= rangeMax;
            const isTarget = target === m;

            let bgClass = "bg-white dark:bg-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-200";
            if (!inRange) {
              bgClass = "bg-neutral-100/60 dark:bg-neutral-300/40 opacity-70";
            }
            if (feedback === "correct") {
              bgClass = "bg-success text-success-foreground ring-2 ring-success";
            } else if (feedback === "wrong") {
              bgClass = "bg-destructive text-destructive-foreground ring-2 ring-destructive animate-pulse";
            } else if (feedback === "pressed") {
              bgClass = "bg-primary/70";
            } else if (isTarget) {
              bgClass = "bg-primary/25 border-b-4 border-b-primary";
            }

            return (
              <button
                key={m}
                type="button"
                onClick={() => onPlayNote?.(m)}
                className={[
                  "flex-1 border-r border-border last:border-r-0 transition-colors duration-100 focus:outline-none",
                  onPlayNote ? "cursor-pointer active:scale-y-[0.98]" : "cursor-default",
                  bgClass,
                ].join(" ")}
                title={`${midiToNote(m).name}${midiToNote(m).octave} (MIDI ${m})`}
              />
            );
          })}
        </div>

        {/* Black keys */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: PIANO_MAX - PIANO_MIN + 1 }, (_, i) => PIANO_MIN + i)
            .filter(isBlackKey)
            .map((m) => {
              const wi = whiteIndex(m);
              const leftPct = ((wi + 1) / whiteCount) * 100;
              const widthPct = (1 / whiteCount) * 100 * 0.65;
              const feedback = getKeyFeedback(m);
              const inRange = m >= rangeMin && m <= rangeMax;
              const isTarget = target === m;

              let bgClass = "bg-neutral-900 hover:bg-neutral-800";
              if (!inRange) {
                bgClass = "bg-neutral-800/60 opacity-60";
              }
              if (feedback === "correct") {
                bgClass = "bg-success ring-2 ring-success";
              } else if (feedback === "wrong") {
                bgClass = "bg-destructive ring-2 ring-destructive animate-pulse";
              } else if (feedback === "pressed") {
                bgClass = "bg-primary";
              } else if (isTarget) {
                bgClass = "bg-primary/80 border-b-4 border-b-primary";
              }

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onPlayNote?.(m)}
                  className={[
                    "pointer-events-auto absolute top-0 h-[62%] -translate-x-1/2 rounded-b-md border border-black/70 shadow-md transition-colors duration-100 focus:outline-none",
                    onPlayNote ? "cursor-pointer active:h-[60%]" : "cursor-default",
                    bgClass,
                  ].join(" ")}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`${midiToNote(m).name}${midiToNote(m).octave} (MIDI ${m})`}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}

