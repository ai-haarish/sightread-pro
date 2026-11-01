import { useEffect, useRef, useState } from "react";
import type { Clef, Note } from "@/lib/music";

interface StaffProps {
  clef: Clef;
  note: Note;
  showCorrectLabel?: string | null;
  flashState?: "correct" | "wrong" | null;
}

/**
 * Renders a single note on a chosen clef using VexFlow.
 * Supports authentic Grand Staff (two staves joined with brace) and single staves.
 * Ample vertical margin ensures ledger lines down to A0 and up to C8 render cleanly.
 */
export function Staff({ clef, note, showCorrectLabel, flashState }: StaffProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRenderError(null);

    (async () => {
      try {
        const VF = await import("vexflow");
        if (cancelled || !hostRef.current) return;
        const host = hostRef.current;
        host.innerHTML = "";

        const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VF;
        const isGrand = clef === "grand";
        const scale = isGrand ? 1.25 : 1.35;
        const clientW = host.clientWidth || 640;
        const baseWidth = Math.max(340, Math.min(clientW, 850));
        // Generous height to fit high and low ledger lines comfortably
        const baseHeight = isGrand ? 270 : 180;
        const width = baseWidth;
        const height = Math.round(baseHeight * scale);

        const renderer = new Renderer(host, Renderer.Backends.SVG);
        renderer.resize(width, height);
        const ctx = renderer.getContext();
        ctx.scale(scale, scale);
        ctx.setFillStyle("currentColor");
        ctx.setStrokeStyle("currentColor");

        const innerWidth = width / scale;
        const staveX = isGrand ? 35 : 25;
        const staveW = innerWidth - staveX - 20;

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

        if (isGrand) {
          // Grand Staff: Treble on top, Bass on bottom
          const trebleY = 25;
          const bassY = 145;

          const trebleStave = new Stave(staveX, trebleY, staveW);
          trebleStave.addClef("treble");
          trebleStave.setContext(ctx).draw();

          const bassStave = new Stave(staveX, bassY, staveW);
          bassStave.addClef("bass");
          bassStave.setContext(ctx).draw();

          // Connect staves with standard brace and line
          try {
            if ("StaveConnector" in VF) {
              const StaveConnector = VF.StaveConnector;
              const braceType = (StaveConnector as unknown as { type?: { BRACE: number } }).type?.BRACE ?? 3;
              const lineType = (StaveConnector as unknown as { type?: { SINGLE_LEFT: number } }).type?.SINGLE_LEFT ?? 1;

              const brace = new StaveConnector(trebleStave, bassStave);
              brace.setType(braceType as unknown as import("vexflow").StaveConnectorType);
              brace.setContext(ctx).draw();

              const leftLine = new StaveConnector(trebleStave, bassStave);
              leftLine.setType(lineType as unknown as import("vexflow").StaveConnectorType);
              leftLine.setContext(ctx).draw();
            }
          } catch {
            // Ignore connector rendering errors if unsupported
          }

          // Determine which stave gets the note:
          const targetClefKind =
            note.targetClef ?? (note.midi >= 60 ? "treble" : "bass");

          const targetStave = targetClefKind === "treble" ? trebleStave : bassStave;
          const sn = buildNote(targetClefKind);
          const voice = new Voice({ numBeats: 1, beatValue: 4 }).setStrict(false);
          voice.addTickables([sn]);
          new Formatter().joinVoices([voice]).format([voice], Math.max(120, staveW - 100));
          voice.draw(ctx, targetStave);
        } else {
          // Single clef staff
          const stave = new Stave(staveX, 40, staveW);
          stave.addClef(clef);
          stave.setContext(ctx).draw();

          const sn = buildNote(clef);
          const voice = new Voice({ numBeats: 1, beatValue: 4 }).setStrict(false);
          voice.addTickables([sn]);
          new Formatter().joinVoices([voice]).format([voice], Math.max(120, staveW - 100));
          voice.draw(ctx, stave);
        }
      } catch (err) {
        console.error("VexFlow render error:", err);
        setRenderError(err instanceof Error ? err.message : "Failed to render sheet music.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clef, note]);

  return (
    <div
      className={[
        "relative w-full rounded-3xl px-4 py-4 transition-all duration-300",
        flashState === "correct" ? "flash-correct ring-2 ring-success/50" : "",
        flashState === "wrong" ? "flash-wrong ring-2 ring-destructive/50" : "",
      ].join(" ")}
    >
      <div ref={hostRef} className="mx-auto flex justify-center text-foreground [&_svg]:max-w-full" />

      {renderError && (
        <div className="py-8 text-center text-sm text-destructive">
          Note: {note.name}{note.octave} (MIDI {note.midi})
          <div className="text-xs text-muted-foreground">{renderError}</div>
        </div>
      )}

      {showCorrectLabel && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-2 flex justify-center">
          <span className="rounded-full bg-destructive px-3.5 py-1 text-xs font-semibold text-destructive-foreground shadow-lg animate-in fade-in zoom-in-95">
            {showCorrectLabel}
          </span>
        </div>
      )}
    </div>
  );
}

