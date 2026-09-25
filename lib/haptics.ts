// Feedback háptico ligero para acciones de navegación y confirmación.
//
// Solo existe en Android/Chrome (iOS Safari no expone `navigator.vibrate`), así que es una mejora
// progresiva: donde no hay API no pasa nada. Los pulsos son de pocos milisegundos a propósito — un
// "tic" que confirma el toque, no una vibración que se note como notificación.

type Pattern = "tap" | "success" | "warning";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 6,
  success: [10, 40, 18],
  warning: [24, 60, 24],
};

export function tapFeedback(pattern: Pattern = "tap"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  // Respeta a quien pide menos movimiento: la vibración es movimiento físico.
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* algunos navegadores lanzan si no hubo gesto del usuario; es un adorno, se ignora */
  }
}
