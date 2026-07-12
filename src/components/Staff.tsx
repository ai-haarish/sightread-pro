import { useEffect, useRef } from "react";
import type { Clef, Note } from "@/lib/music";

interface StaffProps {
  clef: Clef;
  note: Note;
  showCorrectLabel?: string | null;
  flashState?: "correct" | "wrong" | null;
}

/**
 * Renders a single note on a chosen clef using VexFlow.
 * Loads VexFlow lazily so SSR builds don't break.
 */
export function Staff({ clef, note, showCorrectLabel, flashState }: StaffProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const VF = await import("vexflow");
      if (cancelled || !hostRef.current) return;
      const host = hostRef.current;
      host.innerHTML = "";

      const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VF;
      const width = Math.min(host.clientWidth || 680, 900);
      const height = clef === "grand" ? 280 : 210;

      const renderer = new Renderer(host, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();
      // Match theme via currentColor on SVG
      ctx.setFillStyle("currentColor");
      ctx.setStrokeStyle("currentColor");

      const buildNote = (clefKind: string) => {
        const sn = new StaveNote({
          keys: [note.vexKey],
          duration: "q",
          clef: clefKind,
        });
        if (note.accidental === "#" || note.accidental === "b") {
          sn.addModifier(new Accidental(note.accidental), 0);
        }
        return sn;
      };

      const drawStave = (clefKind: "treble" | "bass" | "alto" | "tenor", y: number) => {
        const stave = new Stave(20, y, width - 40);
        stave.addClef(clefKind);
        stave.setContext(ctx).draw();
        // Only place the note on the stave whose range contains the midi
        const belongs =
          clef === "grand"
            ? clefKind === "treble"
              ? note.midi >= 60
              : note.midi < 60
            : true;
        if (belongs) {
          const sn = buildNote(clefKind);
          const voice = new Voice({ numBeats: 1, beatValue: 4 }).setStrict(false);
          voice.addTickables([sn]);
          new Formatter().joinVoices([voice]).format([voice], width - 120);
          voice.draw(ctx, stave);
        }
      };

      if (clef === "grand") {
        drawStave("treble", 10);
        drawStave("bass", 110);
      } else {
        drawStave(clef, 30);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clef, note]);

  return (
    <div
      className={[
        "relative w-full rounded-3xl px-4 py-6 transition-colors",
        flashState === "correct" ? "flash-correct" : "",
        flashState === "wrong" ? "flash-wrong" : "",
      ].join(" ")}
    >
      <div ref={hostRef} className="mx-auto flex justify-center text-foreground [&_svg]:max-w-full" />
      {showCorrectLabel && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-2 flex justify-center">
          <span className="rounded-full bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground shadow-lg">
            {showCorrectLabel}
          </span>
        </div>
      )}
    </div>
  );
}
