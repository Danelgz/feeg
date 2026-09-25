// Cálculos del panel "Hoy" de Inicio. Puros (sin React, sin Date.now() implícito en los tests) para
// poder probarlos y para que la pantalla solo tenga que pintarlos.

export interface InsightWorkout {
  id?: string | number;
  name?: string;
  completedAt?: string;
  totalVolume?: number;
  elapsedTime?: number;
  totalTime?: number;
  series?: number;
}

export interface InsightRoutine {
  id: string | number;
  name: string;
  exercises?: { name?: string; muscleGroup?: string; series?: unknown[] }[];
}

const DAY_MS = 86400000;

function timeOf(w: InsightWorkout): number {
  const ts = w.completedAt ? new Date(w.completedAt).getTime() : NaN;
  return Number.isNaN(ts) ? NaN : ts;
}

function normalizeName(name: string | undefined): string {
  return (name || "").trim().toLocaleLowerCase();
}

/** Lunes 00:00 (hora local) de la semana de `now`. */
export function startOfWeek(now: Date): Date {
  const d = new Date(now.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * Qué días de la semana en curso (lunes → domingo) tienen al menos un entreno. Se devuelve también
 * el índice de hoy para que la fila de puntos pueda marcarlo aunque todavía no se haya entrenado.
 */
export function weekActivity(workouts: InsightWorkout[], now: Date = new Date()): { days: boolean[]; todayIndex: number } {
  const start = startOfWeek(now).getTime();
  const days = Array<boolean>(7).fill(false);
  for (const w of workouts || []) {
    const ts = timeOf(w);
    if (Number.isNaN(ts) || ts < start) continue;
    const idx = Math.floor((ts - start) / DAY_MS);
    if (idx >= 0 && idx < 7) days[idx] = true;
  }
  return { days, todayIndex: (now.getDay() + 6) % 7 };
}

/**
 * Volumen de esta semana frente al MISMO tramo de la semana pasada (lunes → mismo día y hora), no
 * frente a la semana pasada entera: un miércoles comparar contra una semana completa siempre sale
 * en negativo y convierte el dato en una mala noticia permanente.
 */
export function weekVolumeComparison(
  workouts: InsightWorkout[],
  now: Date = new Date()
): { current: number; previous: number; deltaPct: number | null } {
  const start = startOfWeek(now).getTime();
  const elapsed = now.getTime() - start;
  const prevStart = start - 7 * DAY_MS;
  let current = 0;
  let previous = 0;
  for (const w of workouts || []) {
    const ts = timeOf(w);
    if (Number.isNaN(ts)) continue;
    const vol = Number(w.totalVolume) || 0;
    if (ts >= start && ts <= now.getTime()) current += vol;
    else if (ts >= prevStart && ts <= prevStart + elapsed) previous += vol;
  }
  const deltaPct = previous > 0 ? ((current - previous) / previous) * 100 : null;
  return { current, previous, deltaPct };
}

/** Entreno más reciente, o null. No asume que la lista venga ordenada. */
export function latestWorkout<T extends InsightWorkout>(workouts: T[]): T | null {
  let best: T | null = null;
  let bestTs = -Infinity;
  for (const w of workouts || []) {
    const ts = timeOf(w);
    if (!Number.isNaN(ts) && ts > bestTs) {
      best = w;
      bestTs = ts;
    }
  }
  return best;
}

/** Días naturales (no bloques de 24h) entre `date` y `now`: ayer a las 23:00 cuenta como 1. */
export function calendarDaysSince(date: string | undefined, now: Date = new Date()): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((b - a) / DAY_MS));
}

export interface NextRoutineSuggestion<R extends InsightRoutine> {
  routine: R;
  /** Última vez que se hizo (ISO) o null si nunca. */
  lastDoneAt: string | null;
}

/**
 * Siguiente rutina a entrenar: la que lleva más tiempo sin hacerse.
 *
 * Es la regla que reproduce una rotación (Empuje → Tirón → Pierna → Empuje…) sin que el usuario la
 * declare: después de hacer Empuje y Tirón, la que queda más atrás es Pierna. Una rutina que nunca se
 * ha hecho va antes que cualquier otra — es la forma de que una rutina recién creada aparezca aquí.
 * El entreno guardado referencia la rutina por nombre (el id de la rutina no se persiste en el
 * historial), así que la comparación es por nombre normalizado.
 */
export function suggestNextRoutine<R extends InsightRoutine>(
  routines: R[],
  workouts: InsightWorkout[]
): NextRoutineSuggestion<R> | null {
  if (!routines || routines.length === 0) return null;

  const lastByName = new Map<string, { ts: number; iso: string }>();
  for (const w of workouts || []) {
    const ts = timeOf(w);
    if (Number.isNaN(ts)) continue;
    const key = normalizeName(w.name);
    const prev = lastByName.get(key);
    if (!prev || ts > prev.ts) lastByName.set(key, { ts, iso: w.completedAt as string });
  }

  let best: NextRoutineSuggestion<R> | null = null;
  let bestTs = Infinity;
  for (const routine of routines) {
    if (!routine.exercises || routine.exercises.length === 0) continue;
    const last = lastByName.get(normalizeName(routine.name));
    const ts = last ? last.ts : -Infinity;
    // Estricto: ante empate (dos nunca hechas) gana la primera de la lista, que es el orden que el
    // usuario ve en Rutinas.
    if (ts < bestTs) {
      best = { routine, lastDoneAt: last ? last.iso : null };
      bestTs = ts;
    }
  }
  return best;
}

/** Grupos musculares únicos de una rutina, en orden de aparición. */
export function routineMuscleGroups(routine: InsightRoutine, limit = 3): string[] {
  const seen: string[] = [];
  for (const ex of routine.exercises || []) {
    const g = ex.muscleGroup;
    if (g && !seen.includes(g)) seen.push(g);
  }
  return seen.slice(0, limit);
}

/** Saludo por franja horaria (clave de traducción). */
export function greetingKey(now: Date = new Date()): "greet_morning" | "greet_afternoon" | "greet_evening" {
  const h = now.getHours();
  if (h >= 5 && h < 13) return "greet_morning";
  if (h >= 13 && h < 21) return "greet_afternoon";
  return "greet_evening";
}
