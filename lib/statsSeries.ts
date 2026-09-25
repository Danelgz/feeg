// Series temporales para las gráficas de Estadísticas. Puras y con `now` inyectable para poder
// probarlas sin depender del día en que corran los tests.

import { calculateOneRM } from "./exerciseStats";

export interface SeriesWorkout {
  completedAt?: string;
  totalVolume?: number;
  series?: number;
  totalReps?: number;
  elapsedTime?: number;
  totalTime?: number;
  exerciseDetails?: { name?: string; exercise?: string; series?: { reps?: number | string; weight?: number | string; type?: string }[] }[];
  details?: SeriesWorkout["exerciseDetails"];
}

export type Granularity = "week" | "month";
export type Metric = "volume" | "series" | "sessions" | "minutes";

export interface Bucket {
  key: string;
  start: Date;
  /** El cubo que contiene `now` (semana o mes en curso). */
  current: boolean;
  volume: number;
  series: number;
  sessions: number;
  minutes: number;
}

const DAY_MS = 86400000;

function ts(w: SeriesWorkout): number {
  const t = w.completedAt ? new Date(w.completedAt).getTime() : NaN;
  return Number.isNaN(t) ? NaN : t;
}

function minutesOf(w: SeriesWorkout): number {
  if (w.elapsedTime !== undefined && w.elapsedTime !== null) return Math.round(Number(w.elapsedTime || 0) / 60);
  return Number(w.totalTime || 0);
}

function weekStart(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Los últimos `count` cubos (semanas lunes→domingo o meses naturales) terminando en el que contiene
 * `now`, del más antiguo al más reciente. Los cubos vacíos se incluyen: una semana sin entrenar es un
 * dato, no un hueco que haya que cerrar juntando las barras.
 */
export function bucketWorkouts(workouts: SeriesWorkout[], granularity: Granularity, count: number, now: Date = new Date()): Bucket[] {
  const starts: Date[] = [];
  let cursor = granularity === "week" ? weekStart(now) : monthStart(now);
  for (let i = 0; i < count; i++) {
    starts.unshift(new Date(cursor));
    cursor = granularity === "week" ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7) : new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }
  const buckets: Bucket[] = starts.map((start, i) => ({
    key: keyOf(start),
    start,
    current: i === starts.length - 1,
    volume: 0,
    series: 0,
    sessions: 0,
    minutes: 0,
  }));
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const w of workouts || []) {
    const t = ts(w);
    if (Number.isNaN(t) || t > now.getTime()) continue;
    const d = new Date(t);
    const b = byKey.get(keyOf(granularity === "week" ? weekStart(d) : monthStart(d)));
    if (!b) continue;
    b.volume += Number(w.totalVolume) || 0;
    b.series += Number(w.series) || 0;
    b.sessions += 1;
    b.minutes += minutesOf(w);
  }
  return buckets;
}

export interface HeatDay {
  key: string;
  date: Date;
  volume: number;
  sessions: number;
  /** Día posterior a hoy (la columna de la semana en curso sigue hasta el domingo). */
  future: boolean;
}

/**
 * Rejilla de constancia: `weeks` columnas (lunes→domingo) acabando en la semana de `now`.
 * Devuelve las columnas en orden cronológico; cada una con sus 7 días.
 */
export function activityGrid(workouts: SeriesWorkout[], weeks: number, now: Date = new Date()): HeatDay[][] {
  const last = weekStart(now);
  const first = new Date(last.getFullYear(), last.getMonth(), last.getDate() - (weeks - 1) * 7);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const byDay = new Map<string, { volume: number; sessions: number }>();
  for (const w of workouts || []) {
    const t = ts(w);
    if (Number.isNaN(t)) continue;
    const d = new Date(t);
    const k = keyOf(d);
    const cur = byDay.get(k) || { volume: 0, sessions: 0 };
    cur.volume += Number(w.totalVolume) || 0;
    cur.sessions += 1;
    byDay.set(k, cur);
  }

  const columns: HeatDay[][] = [];
  for (let c = 0; c < weeks; c++) {
    const col: HeatDay[] = [];
    for (let r = 0; r < 7; r++) {
      const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + c * 7 + r);
      const k = keyOf(date);
      const v = byDay.get(k);
      col.push({ key: k, date, volume: v?.volume || 0, sessions: v?.sessions || 0, future: date.getTime() > today });
    }
    columns.push(col);
  }
  return columns;
}

/** Nivel 0-4 de un día en la rejilla, por cuartiles del volumen de los días entrenados. */
export function heatLevels(grid: HeatDay[][]): (day: HeatDay) => number {
  const vols = grid
    .flat()
    .filter((d) => d.sessions > 0)
    .map((d) => d.volume)
    .sort((a, b) => a - b);
  if (vols.length === 0) return () => 0;
  const q = (p: number) => vols[Math.floor(p * (vols.length - 1))];
  const t1 = q(0.25);
  const t2 = q(0.5);
  const t3 = q(0.75);
  return (d) => {
    if (d.sessions === 0) return 0;
    if (d.volume <= t1) return 1;
    if (d.volume <= t2) return 2;
    if (d.volume <= t3) return 3;
    return 4;
  };
}

export interface TrendPoint {
  date: string;
  /** Mejor 1RM estimado de ese entreno para el ejercicio. */
  value: number;
}

/**
 * Evolución del mejor 1RM estimado por sesión de un ejercicio, en orden cronológico. Sólo series con
 * peso: un ejercicio a peso corporal no tiene tendencia de carga que dibujar.
 */
export function exerciseTrend(workouts: SeriesWorkout[], exerciseName: string): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (const w of workouts || []) {
    if (!w.completedAt) continue;
    let best = 0;
    for (const ex of w.exerciseDetails || w.details || []) {
      if ((ex.name || ex.exercise) !== exerciseName) continue;
      for (const s of ex.series || []) {
        const e1rm = calculateOneRM(Number(s.weight) || 0, Number(s.reps) || 0);
        if (e1rm > best) best = e1rm;
      }
    }
    if (best > 0) points.push({ date: w.completedAt, value: best });
  }
  return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Variación porcentual entre el primer y el último valor de una tendencia (null si < 2 puntos). */
export function trendDelta(points: TrendPoint[]): number | null {
  if (points.length < 2 || points[0].value <= 0) return null;
  return ((points[points.length - 1].value - points[0].value) / points[0].value) * 100;
}

/** Valor de la métrica en un cubo. */
export function metricValue(b: Bucket, metric: Metric): number {
  return b[metric];
}

export { DAY_MS };
