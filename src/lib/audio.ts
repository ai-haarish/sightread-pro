// Tiny WebAudio helper for success/error feedback tones.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function tone(freq: number, duration: number, when = 0, type: OscillatorType = "sine", gain = 0.12) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

export function playSuccess() {
  tone(659.25, 0.12, 0, "sine", 0.1); // E5
  tone(987.77, 0.18, 0.08, "sine", 0.08); // B5
}

export function playError() {
  tone(220, 0.18, 0, "sawtooth", 0.06); // A3 buzz
  tone(146.83, 0.22, 0.05, "sawtooth", 0.05);
}

export function playMidiNote(midi: number, duration = 0.6) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  tone(freq, duration, 0, "triangle", 0.14);
  tone(freq * 2, duration * 0.6, 0, "sine", 0.04);
}
