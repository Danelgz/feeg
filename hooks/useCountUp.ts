import { useEffect, useRef, useState } from "react";

/**
 * Anima un número desde el valor anterior (0 la primera vez) hasta `target`.
 *
 * Para cifras protagonistas (volumen de la semana, entrenos) donde ver el número "subir" refuerza
 * la sensación de progreso. Con `prefers-reduced-motion` devuelve el valor final directamente.
 * Usa requestAnimationFrame con una curva ease-out: arranca rápido y frena al llegar, que es lo que
 * hace que el número se lea como "aterrizando" y no como un contador de gasolinera.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const to = Number.isFinite(target) ? target : 0;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof requestAnimationFrame !== "function") {
      fromRef.current = to;
      setValue(to);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * eased;
      setValue(v);
      if (p < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = to;
    };
  }, [target, durationMs]);

  return value;
}
