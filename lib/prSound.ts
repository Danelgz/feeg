// Sonido de récord personal, sintetizado con Web Audio API — sin assets, sin dependencias,
// cero peso añadido al bundle. Dos tonos ascendentes cortos (cuarta justa, ~660Hz -> ~880Hz),
// consonantes y breves, en la línea de los sonidos de éxito del ecosistema Apple. El nivel
// "historic" añade un tercer tono como remate, sin cambiar el carácter del sonido.

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  if (sharedContext.state === "suspended") {
    sharedContext.resume().catch(() => {});
  }
  return sharedContext;
}

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, peakGain: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export type PRSoundTier = "minor" | "major" | "historic";

/** Reproduce el chime de récord personal. No hace nada si el navegador no soporta Web Audio. */
export function playPRChime(tier: PRSoundTier = "minor"): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const peakGain = 0.18;

    playTone(ctx, 659.25, now, 0.16, peakGain); // Mi5
    playTone(ctx, 880, now + 0.09, 0.22, peakGain); // La5

    if (tier === "historic") {
      playTone(ctx, 1174.66, now + 0.19, 0.26, peakGain * 0.9); // Re6 — remate del salto grande
    }
  } catch (_) {
    /* Web Audio bloqueado o no soportado del todo — fallar en silencio, nunca romper el flujo. */
  }
}
