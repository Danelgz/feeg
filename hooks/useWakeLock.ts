import { useEffect } from "react";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

/**
 * Mantiene la pantalla encendida mientras `active` sea true (entreno en curso): entre serie y serie
 * el móvil se bloqueaba y había que desbloquearlo para apuntar cada serie. El navegador suelta el
 * bloqueo al cambiar de pestaña, así que se vuelve a pedir al volver. Donde la API no existe
 * (Safari antiguo, escritorio) no hace nada.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return undefined;
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock;
    if (!wakeLock) return undefined;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        const s = await wakeLock.request("screen");
        if (cancelled) s.release().catch(() => {});
        else sentinel = s;
      } catch {
        /* denegado (batería baja, pestaña oculta): sin más */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
