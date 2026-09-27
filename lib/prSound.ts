// Sonido de récord personal — reproduce public/record.mp3. Se reutiliza una única instancia de
// Audio (no se crea una nueva en cada récord) y se rebobina a 0 antes de cada reproducción para
// que dos récords seguidos en poco tiempo no se corten entre sí.

let sharedAudio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio("/record.mp3");
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

/** Reproduce el sonido de récord personal. No hace nada si el navegador bloquea el audio. */
export function playPRChime(): void {
  const audio = getAudio();
  if (!audio) return;
  try {
    audio.currentTime = 0;
    void audio.play()?.catch(() => {
      /* autoplay bloqueado por el navegador u otra causa — fallar en silencio */
    });
  } catch (_) {
    /* nunca romper el flujo del entreno por un problema de audio */
  }
}

let audioCtx: AudioContext | null = null;

/**
 * Aviso de fin de descanso: dos pitidos cortos sintetizados (sin archivo que descargar). Con el
 * móvil en el banco y la vista en otra parte, la vibración sola se pierde.
 */
export function playRestDoneChime(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx || new Ctor();
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    [0, 0.22].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i ? 1175 : 880;
      const t = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch (_) {
    /* sin audio: el aviso sigue siendo la vibración */
  }
}
