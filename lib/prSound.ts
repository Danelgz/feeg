// Sonido de récord personal, sintetizado con Web Audio API — sin assets, sin dependencias,
// cero peso añadido al bundle. Timbre tipo "acierto de juego" (dos notas ascendentes brillantes,
// bi-bling), pedido explícitamente por el usuario en vez del chime más discreto de la v1. El
// nivel "historic" añade una tercera nota como remate, sin cambiar el carácter del sonido.

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

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  peakGain: number,
  type: OscillatorType = "triangle"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Capa de armónico agudo por encima de una nota — es lo que le da el "brillo" al bling. */
function playSparkle(ctx: AudioContext, freq: number, startTime: number, duration: number, peakGain: number) {
  playTone(ctx, freq, startTime, duration, peakGain, "sine");
}

export type PRSoundTier = "minor" | "major" | "historic";

/** Reproduce el chime de récord personal. No hace nada si el navegador no soporta Web Audio. */
export function playPRChime(tier: PRSoundTier = "minor"): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const peakGain = 0.22;

    // Bi-bling: nota base + nota alta con su propio armónico de brillo encima ("sparkle").
    playTone(ctx, 1046.5, now, 0.13, peakGain); // Do6
    playTone(ctx, 1567.98, now + 0.08, 0.24, peakGain); // Sol6 — el "bling"
    playSparkle(ctx, 3135.96, now + 0.08, 0.18, peakGain * 0.4);

    if (tier === "historic") {
      playTone(ctx, 2093, now + 0.21, 0.24, peakGain * 0.85); // remate del salto grande
      playSparkle(ctx, 4186, now + 0.21, 0.16, peakGain * 0.3);
    }
  } catch (_) {
    /* Web Audio bloqueado o no soportado del todo — fallar en silencio, nunca romper el flujo. */
  }
}
