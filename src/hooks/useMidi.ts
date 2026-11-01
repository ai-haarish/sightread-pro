import { useEffect, useRef, useState } from "react";

export interface MidiDevice {
  id: string;
  name: string;
}

export interface UseMidiOptions {
  onNoteOn?: (midi: number, velocity: number) => void;
  onNoteOff?: (midi: number) => void;
}

type MidiAccessLike = {
  inputs: Map<string, MIDIInput>;
  onstatechange: ((e: MIDIConnectionEvent) => void) | null;
};

/**
 * Web MIDI hook. Auto-attaches to all inputs, tracks currently-pressed keys,
 * and ignores control changes (sustain pedal etc.) for note checking.
 */
export function useMidi(options: UseMidiOptions = {}) {
  const { onNoteOn, onNoteOff } = options;
  const [supported, setSupported] = useState(false);
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const accessRef = useRef<MidiAccessLike | null>(null);
  const callbacksRef = useRef({ onNoteOn, onNoteOff });
  callbacksRef.current = { onNoteOn, onNoteOff };

  const handleMessage = (msg: MIDIMessageEvent) => {
    const data = msg.data;
    if (!data || data.length < 3) return;
    const status = data[0] & 0xf0;
    const note = data[1];
    const velocity = data[2];
    if (status === 0x90 && velocity > 0) {
      setPressed((prev) => {
        const next = new Set(prev);
        next.add(note);
        return next;
      });
      callbacksRef.current.onNoteOn?.(note, velocity);
    } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      setPressed((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      callbacksRef.current.onNoteOff?.(note);
    }
  };

  const attachInputs = (access: MidiAccessLike) => {
    const list: MidiDevice[] = [];
    access.inputs.forEach((input) => {
      input.onmidimessage = handleMessage;
      list.push({ id: input.id, name: input.name ?? "MIDI Input" });
    });
    setDevices(list);
    setConnected(list.length > 0);
  };

  const connect = async () => {
    if (typeof navigator === "undefined" || !("requestMIDIAccess" in navigator)) {
      setError("Web MIDI is not supported in this browser.");
      return;
    }
    try {
      const access = (await navigator.requestMIDIAccess({ sysex: false })) as unknown as MidiAccessLike;
      accessRef.current = access;
      attachInputs(access);
      access.onstatechange = () => attachInputs(access);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to access MIDI.");
    }
  };

  useEffect(() => {
    const isSupported = typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
    setSupported(isSupported);
    if (isSupported) {
      // Auto-connect if permission is available
      connect();
    }
  }, []);

  return { supported, connected, devices, error, pressed, connect };
}
