import { useEffect, useRef, useState } from "react";

interface Options {
  /** Cuánto debe seguir `active` en true antes de que `show` pase a true. */
  showDelayMs?: number;
  /** Una vez visible, cuánto se mantiene `show` en true como mínimo, aunque `active` ya sea false. */
  minVisibleMs?: number;
}

/**
 * Convierte un booleano "activo ahora mismo" (p. ej. isSyncing) en un booleano "muéstralo en
 * pantalla" que no parpadea: si `active` se apaga antes de `showDelayMs`, `show` nunca llega a
 * ponerse a true (evita el flash al cambiar de apartado, cuando la sincronización de fondo tarda
 * menos que ese margen). Si sí llega a mostrarse, se queda visible al menos `minVisibleMs` desde
 * ese instante aunque `active` ya haya terminado — así nunca se ve como un parpadeo de "de verdad
 * era necesario mostrarlo". Si `active` vuelve a true mientras el temporizador de ocultado está
 * pendiente, ese ocultado se cancela y el overlay sigue visible sin cortes entre sincronizaciones
 * consecutivas.
 */
export function useMinDurationLoading(active: boolean, { showDelayMs = 300, minVisibleMs = 3000 }: Options = {}) {
  const [show, setShow] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (!show && !showTimerRef.current) {
        showTimerRef.current = setTimeout(() => {
          shownAtRef.current = Date.now();
          showTimerRef.current = null;
          setShow(true);
        }, showDelayMs);
      }
    } else {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (show) {
        const elapsed = Date.now() - (shownAtRef.current ?? Date.now());
        const remaining = Math.max(0, minVisibleMs - elapsed);
        hideTimerRef.current = setTimeout(() => {
          hideTimerRef.current = null;
          shownAtRef.current = null;
          setShow(false);
        }, remaining);
      }
    }
  }, [active, show, showDelayMs, minVisibleMs]);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return show;
}
