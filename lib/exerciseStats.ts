// Lógica pura de estadísticas de ejercicio: sin React, sin DOM, testeable a mano.
// Fuente única para el motor de sesión de entrenamiento y para pages/exercise-history.js.

import { exercisesList } from "../data/exercises";

export interface ExerciseCatalogInfo {
  id: number | string;
  name: string;
  type: "weight_reps" | "reps" | "time";
  unit?: string;
  group: string;
}

export interface CompletedSeries {
  reps: number | string;
  weight: number | string;
  type?: string;
}

export interface CompletedExerciseDetail {
  name?: string;
  exercise?: string;
  muscleGroup?: string;
  series: CompletedSeries[];
}

export interface CompletedWorkout {
  completedAt?: string;
  exerciseDetails?: CompletedExerciseDetail[];
  details?: CompletedExerciseDetail[];
}

export interface ExerciseSeriesLike {
  reps: number | string;
  weight: number | string;
  type?: string;
}

/** Busca un ejercicio por nombre en el catálogo estático, con su grupo muscular. */
export function getExerciseInfo(name: string): ExerciseCatalogInfo | null {
  for (const group in exercisesList) {
    const ex = (exercisesList as Record<string, any[]>)[group].find((e) => e.name === name);
    if (ex) return { ...ex, group };
  }
  return null;
}

/** Etiqueta de unidad para mostrar junto al peso (compartido entre ExerciseCard y el toast de PR). */
export function weightUnitFor(exercise: { exerciseType?: string; unit?: string }): string {
  if (exercise.exerciseType === "time") return "m";
  if (exercise.unit === "lastre") return "L";
  return "kg";
}

/** 1RM estimado, fórmula de Brzycki (misma que ya usa pages/exercise-history.js). */
export function calculateOneRM(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  if (reps >= 37) return weight; // fórmula degenera por encima de 36 reps, evita división por <=0
  return weight * (36 / (37 - reps));
}

const toNumber = (v: number | string | undefined): number => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n as number) ? (n as number) : 0;
};

export interface WorkoutTotals {
  totalReps: number;
  totalVolume: number;
  totalSeries: number;
}

/**
 * Totales de una lista de ejercicios de la sesión en curso (o de un completedWorkout ya guardado).
 * Excluye por defecto las series de calentamiento ("W") del volumen/reps — antes el modal de tipo
 * de serie prometía esto pero ningún cálculo real lo aplicaba.
 */
export function computeWorkoutTotals(
  exercises: { series: ExerciseSeriesLike[] }[],
  opts: { excludeTypes?: string[]; onlyCompleted?: boolean } = {}
): WorkoutTotals {
  const excludeTypes = opts.excludeTypes ?? ["W"];
  let totalReps = 0;
  let totalVolume = 0;
  let totalSeries = 0;

  exercises.forEach((ex) => {
    ex.series.forEach((s: any) => {
      if (excludeTypes.includes(s.type)) return;
      if (opts.onlyCompleted && s.completed !== true) return;
      const reps = toNumber(s.reps);
      const weight = toNumber(s.weight);
      totalReps += reps;
      totalVolume += reps * weight;
      totalSeries += 1;
    });
  });

  return { totalReps, totalVolume, totalSeries };
}

export interface ExercisePersonalRecord {
  byReps: Record<number, number>; // reps -> mejor peso levantado a ese número exacto de reps
  byWeight: Record<number, number>; // peso -> más repeticiones hechas a ese peso exacto
  best1RM: number;
  maxSingleSetVolume: number;
}

export type PersonalRecordsMap = Record<string, ExercisePersonalRecord>;

/** Recalcula los récords personales de TODOS los ejercicios a partir del histórico completo. */
export function computePersonalRecords(completedWorkouts: CompletedWorkout[]): PersonalRecordsMap {
  const map: PersonalRecordsMap = {};

  (completedWorkouts || []).forEach((w) => {
    const details = w.exerciseDetails || w.details || [];
    details.forEach((detail) => {
      const name = detail.name || detail.exercise;
      if (!name || !Array.isArray(detail.series)) return;

      if (!map[name]) {
        map[name] = { byReps: {}, byWeight: {}, best1RM: 0, maxSingleSetVolume: 0 };
      }
      const record = map[name];

      detail.series.forEach((s) => {
        if (s.type === "W") return; // el calentamiento no cuenta para récords
        const weight = toNumber(s.weight);
        const reps = Math.round(toNumber(s.reps));
        if (weight <= 0 || reps <= 0) return;

        if (!record.byReps[reps] || record.byReps[reps] < weight) {
          record.byReps[reps] = weight;
        }
        if (!record.byWeight[weight] || record.byWeight[weight] < reps) {
          record.byWeight[weight] = reps;
        }
        record.best1RM = Math.max(record.best1RM, calculateOneRM(weight, reps));
        record.maxSingleSetVolume = Math.max(record.maxSingleSetVolume, weight * reps);
      });
    });
  });

  return map;
}

// Umbrales de magnitud (en % de mejora del 1RM estimado) que separan un récord "de trámite"
// de uno que merece más peso visual. Documentados aquí para que sean el único sitio a tocar
// si se recalibran — ver el diseño de niveles de récord acordado con el usuario.
export const PR_MAJOR_THRESHOLD_PCT = 2.5;
export const PR_HISTORIC_THRESHOLD_PCT = 10;

export type PRTier = "first" | "minor" | "major" | "historic";

/**
 * Hasta 5 tipos de récord distintos que una sola serie puede disparar a la vez (p.ej. una serie
 * puede ser récord de peso Y de 1RM estimado en el mismo golpe). El 5º tipo, "workoutVolume", no
 * se detecta aquí — es un récord de sesión completa, ver checkWorkoutVolumePR más abajo.
 */
export type PRRecordType = "weight" | "reps" | "oneRM" | "setVolume" | "workoutVolume";

export interface PRTypeResult {
  type: PRRecordType;
  previousValue: number;
  newValue: number;
  deltaAbsolute: number;
  deltaPercent: number | null;
}

export interface PRCheckResult {
  /** Récord genuino (hay algo real que superar). Nunca true si isFirstEver. */
  isPR: boolean;
  /** No existía ningún historial previo para este ejercicio — no es "un récord", es el primero. */
  isFirstEver: boolean;
  /** Uno por cada tipo de récord conseguido en esta serie — vacío si no hay ninguno. */
  types: PRTypeResult[];
  /** null cuando no es ni récord ni primera vez. */
  tier: PRTier | null;
  /** % de mejora del 1RM estimado vs. el mejor histórico — la señal que decide el tier. */
  deltaOneRMPercent: number | null;
}

const EMPTY_PR_RESULT: PRCheckResult = {
  isPR: false,
  isFirstEver: false,
  types: [],
  tier: null,
  deltaOneRMPercent: null,
};

/**
 * Comprueba si una serie recién completada es un récord personal, contra un mapa ya
 * precalculado (computePersonalRecords) — O(1), no recorre completedWorkouts. Distingue
 * "primera vez que se registra este ejercicio" de un récord real: sin historial previo no hay
 * nada que superar, así que isPR queda en false y solo isFirstEver es true. Comprueba 4 tipos de
 * récord de forma independiente (una serie puede disparar varios a la vez): peso a estas
 * repeticiones exactas, repeticiones a este peso exacto, 1RM estimado, y volumen de la serie.
 */
export function checkForNewPR(
  exerciseName: string,
  reps: number,
  weight: number,
  prMap: PersonalRecordsMap
): PRCheckResult {
  const roundedReps = Math.round(reps);
  if (!exerciseName || weight <= 0 || roundedReps <= 0) return EMPTY_PR_RESULT;

  const record = prMap[exerciseName];
  const isFirstEver = !record || record.best1RM <= 0;
  if (isFirstEver) {
    return { ...EMPTY_PR_RESULT, isFirstEver: true, tier: "first" };
  }

  const types: PRTypeResult[] = [];

  const previousBestAtReps = record.byReps[roundedReps] ?? null;
  if (previousBestAtReps !== null && weight > previousBestAtReps) {
    types.push({
      type: "weight",
      previousValue: previousBestAtReps,
      newValue: weight,
      deltaAbsolute: weight - previousBestAtReps,
      deltaPercent: (( weight - previousBestAtReps) / previousBestAtReps) * 100,
    });
  }

  const previousBestReps = record.byWeight[weight] ?? null;
  if (previousBestReps !== null && roundedReps > previousBestReps) {
    types.push({
      type: "reps",
      previousValue: previousBestReps,
      newValue: roundedReps,
      deltaAbsolute: roundedReps - previousBestReps,
      deltaPercent: ((roundedReps - previousBestReps) / previousBestReps) * 100,
    });
  }

  const oneRM = calculateOneRM(weight, roundedReps);
  const deltaOneRMPercent = record.best1RM > 0 ? ((oneRM - record.best1RM) / record.best1RM) * 100 : null;
  if (record.best1RM > 0 && oneRM > record.best1RM) {
    types.push({
      type: "oneRM",
      previousValue: record.best1RM,
      newValue: oneRM,
      deltaAbsolute: oneRM - record.best1RM,
      deltaPercent: deltaOneRMPercent,
    });
  }

  const setVolume = weight * roundedReps;
  if (record.maxSingleSetVolume > 0 && setVolume > record.maxSingleSetVolume) {
    types.push({
      type: "setVolume",
      previousValue: record.maxSingleSetVolume,
      newValue: setVolume,
      deltaAbsolute: setVolume - record.maxSingleSetVolume,
      deltaPercent: ((setVolume - record.maxSingleSetVolume) / record.maxSingleSetVolume) * 100,
    });
  }

  const isPR = types.length > 0;
  let tier: PRTier | null = null;
  if (isPR) {
    if (deltaOneRMPercent !== null && deltaOneRMPercent >= PR_HISTORIC_THRESHOLD_PCT) tier = "historic";
    else if (deltaOneRMPercent !== null && deltaOneRMPercent >= PR_MAJOR_THRESHOLD_PCT) tier = "major";
    else tier = "minor";
  }

  return { isPR, isFirstEver: false, types, tier, deltaOneRMPercent };
}

/**
 * 5º tipo de récord: volumen total de UN entrenamiento completo, comparado contra el mejor
 * histórico entre todos los entrenamientos guardados. Se comprueba una sola vez al terminar la
 * sesión (no por serie, como los otros 4) porque hasta el final no se conoce el total real.
 */
export function checkWorkoutVolumePR(
  newTotalVolume: number,
  completedWorkouts: { totalVolume?: number }[]
): PRTypeResult | null {
  if (newTotalVolume <= 0) return null;
  const previousBest = (completedWorkouts || []).reduce((max, w) => Math.max(max, w.totalVolume || 0), 0);
  if (previousBest <= 0 || newTotalVolume <= previousBest) return null;

  return {
    type: "workoutVolume",
    previousValue: previousBest,
    newValue: newTotalVolume,
    deltaAbsolute: newTotalVolume - previousBest,
    deltaPercent: ((newTotalVolume - previousBest) / previousBest) * 100,
  };
}

export interface PRSummaryRecord {
  name: string;
  /** null cuando el único motivo es "primera vez" — ver isFirstEver. */
  tier: PRTier | null;
  isFirstEver: boolean;
  types: PRTypeResult[];
  weightUnit: string;
  reps: number;
  weight: number;
}

const PR_TIER_RANK: Record<PRTier, number> = { historic: 3, major: 2, minor: 1, first: 0 };

const PR_TYPE_PRIORITY: PRRecordType[] = ["weight", "setVolume", "oneRM", "reps"];

/**
 * Elige qué tipo de récord destacar cuando una serie logra varios a la vez (p.ej. peso + 1RM en
 * el mismo golpe) — compartido entre PRToast y WorkoutSummaryScreen para que ambos coincidan en
 * cuál es "el" récord de esa serie.
 */
export function pickPrimaryPRType(types: PRTypeResult[]): PRTypeResult | null {
  for (const key of PR_TYPE_PRIORITY) {
    const found = types.find((t) => t.type === key);
    if (found) return found;
  }
  return types[0] || null;
}

function oneRMDeltaPercentOf(types: PRTypeResult[]): number {
  return types.find((t) => t.type === "oneRM")?.deltaPercent ?? 0;
}

/**
 * Un registro por ejercicio (no por serie) para la pantalla de resumen final — si hubo varias
 * series-récord del mismo ejercicio en la sesión, se queda con la de mayor magnitud (tier más
 * alto y, en empate, mayor % de mejora del 1RM). Única fuente para empty.js/[id].js: evita que
 * cada página reimplemente el mismo criterio de "cuál PR represento" con matices distintos.
 */
export function buildPRRecordsFromExercises(
  exercises: { name: string; unit?: string; exerciseType?: string; series: any[] }[]
): PRSummaryRecord[] {
  const records: PRSummaryRecord[] = [];

  exercises.forEach((ex) => {
    const candidates = ex.series.filter((s: any) => s.completed && (s.isPR || s.isFirstEver));
    if (candidates.length === 0) return;

    const best = candidates.reduce((a: any, b: any) => {
      const rankA = a.isPR ? PR_TIER_RANK[a.prTier as PRTier] ?? 0 : 0;
      const rankB = b.isPR ? PR_TIER_RANK[b.prTier as PRTier] ?? 0 : 0;
      if (rankB !== rankA) return rankB > rankA ? b : a;
      return oneRMDeltaPercentOf(b.prTypes || []) > oneRMDeltaPercentOf(a.prTypes || []) ? b : a;
    });

    records.push({
      name: ex.name,
      tier: best.isPR ? (best.prTier as PRTier) : null,
      isFirstEver: !best.isPR && !!best.isFirstEver,
      types: best.prTypes || [],
      weightUnit: weightUnitFor(ex),
      reps: Math.round(toNumber(best.reps)),
      weight: toNumber(best.weight),
    });
  });

  return records;
}
