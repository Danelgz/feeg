// Calculadora de discos: qué poner en cada lado de la barra para llegar a un peso.

export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const BAR_OPTIONS = [20, 15, 10];

export interface PlateResult {
  /** Discos de UN lado, del más pesado al más ligero. */
  perSide: number[];
  /** Peso que se consigue de verdad (puede quedarse por debajo si no hay discos para cuadrar). */
  achieved: number;
  /** Lo que falta hasta el objetivo (0 si cuadra). */
  remainder: number;
}

/** Reparto voraz, que es óptimo con los juegos de discos estándar (cada uno múltiplo del siguiente o casi). */
export function platesFor(target: number, bar = 20, plates: number[] = DEFAULT_PLATES): PlateResult {
  const t = Number(target);
  if (!Number.isFinite(t) || t <= bar) return { perSide: [], achieved: bar, remainder: Math.max(0, Math.round((t - bar) * 100) / 100) };
  let side = Math.round(((t - bar) / 2) * 1000) / 1000;
  const perSide: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (side + 1e-9 >= p) {
      perSide.push(p);
      side = Math.round((side - p) * 1000) / 1000;
    }
  }
  const achieved = bar + perSide.reduce((a, b) => a + b, 0) * 2;
  return { perSide, achieved, remainder: Math.round((t - achieved) * 100) / 100 };
}

/** Colores de disco de competición (IWF), para que el dibujo se lea como en el gimnasio. */
export function plateColor(kg: number): string {
  if (kg >= 25) return "#e5484d";
  if (kg >= 20) return "#3b82f6";
  if (kg >= 15) return "#eab308";
  if (kg >= 10) return "#22a55a";
  if (kg >= 5) return "#e8e8e8";
  if (kg >= 2.5) return "#1f1f1f";
  return "#b0b0b0";
}
