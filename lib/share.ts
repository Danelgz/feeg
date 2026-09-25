/**
 * Comparte un enlace con la hoja nativa del sistema (móvil) o, si no existe, lo copia al
 * portapapeles. Devuelve qué pasó para que la pantalla pueda avisar ("Enlace copiado").
 */
export async function shareLink(url: string, title: string, text?: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (e) {
    // Cerrar la hoja de compartir sin elegir nada lanza AbortError: no es un fallo.
    if (e instanceof Error && e.name === "AbortError") return "shared";
    return "failed";
  }
}
