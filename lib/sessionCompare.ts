// Comparación con la última vez que se hizo el mismo entreno (mismo nombre de rutina): responde a
// "¿he ido a más?" nada más terminar, sin tener que ir a Estadísticas.

export interface ComparableWorkout {
  id?: string | number;
  name?: string;
  completedAt?: string;
  totalVolume?: number | string;
  series?: number;
  elapsedTime?: number;
  totalTime?: number;
}

export interface SessionComparison {
  previousDate: string;
  volumeDelta: number;
  volumePct: number | null;
  minutesDelta: number;
  seriesDelta: number;
}

const minutesOf = (w: ComparableWorkout) =>
  w.elapsedTime !== undefined && w.elapsedTime !== null ? Math.round(Number(w.elapsedTime) / 60) : Number(w.totalTime || 0);

const norm = (s?: string) => (s || "").trim().toLowerCase();

export function findPreviousSameWorkout(current: ComparableWorkout, history: ComparableWorkout[]): ComparableWorkout | null {
  const name = norm(current.name);
  if (!name) return null;
  const now = current.completedAt ? new Date(current.completedAt).getTime() : Date.now();
  let best: ComparableWorkout | null = null;
  let bestTime = -Infinity;
  for (const w of history || []) {
    if (!w || norm(w.name) !== name) continue;
    if (current.id !== undefined && w.id === current.id) continue;
    const t = w.completedAt ? new Date(w.completedAt).getTime() : NaN;
    if (!Number.isFinite(t) || t >= now) continue;
    if (t > bestTime) {
      best = w;
      bestTime = t;
    }
  }
  return best;
}

export function compareWithPrevious(current: ComparableWorkout, history: ComparableWorkout[]): SessionComparison | null {
  const prev = findPreviousSameWorkout(current, history);
  if (!prev || !prev.completedAt) return null;
  const curVol = Number(current.totalVolume) || 0;
  const prevVol = Number(prev.totalVolume) || 0;
  return {
    previousDate: prev.completedAt,
    volumeDelta: Math.round(curVol - prevVol),
    volumePct: prevVol > 0 ? Math.round(((curVol - prevVol) / prevVol) * 100) : null,
    minutesDelta: minutesOf(current) - minutesOf(prev),
    seriesDelta: (Number(current.series) || 0) - (Number(prev.series) || 0),
  };
}

/** "+320" / "−15" / "=" con signo tipográfico y miles a la española. */
export function signed(n: number): string {
  if (n === 0) return "=";
  const abs = Math.abs(n).toLocaleString("es-ES");
  return n > 0 ? `+${abs}` : `−${abs}`;
}

/**
 * Segundos a guardar como `elapsedTime`. Toda la app (feed, perfil, calendario, estadísticas,
 * resumen, imagen para compartir) lee `elapsedTime` antes que `totalTime`, así que si al terminar
 * se corrige la duración (p.ej. se olvidó parar el entreno) hay que guardarla AQUÍ: antes sólo iba
 * a `totalTime` y la corrección no se veía en ningún sitio.
 */
export function resolveElapsedSeconds(realSeconds: number, editedMinutes: number | string | null | undefined): number {
  const real = Math.max(0, Math.round(Number(realSeconds) || 0));
  const edited = Number(editedMinutes);
  if (!Number.isFinite(edited) || edited <= 0) return real;
  return edited === Math.floor(real / 60) ? real : Math.round(edited * 60);
}
