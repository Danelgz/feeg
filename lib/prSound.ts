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
