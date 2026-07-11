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
        map[name] = { byReps: {}, best1RM: 0, maxSingleSetVolume: 0 };
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
        record.best1RM = Math.max(record.best1RM, calculateOneRM(weight, reps));
        record.maxSingleSetVolume = Math.max(record.maxSingleSetVolume, weight * reps);
      });
    });
  });

  return map;
}

export interface PRCheckResult {
  isPR: boolean;
  isRepPR: boolean;
  isOneRMPR: boolean;
  previousBestAtReps: number | null;
}

/**
 * Comprueba si una serie recién completada es un récord personal, contra un mapa
 * ya precalculado (computePersonalRecords) — O(1), no recorre completedWorkouts.
 */
export function checkForNewPR(
  exerciseName: string,
  reps: number,
  weight: number,
  prMap: PersonalRecordsMap
): PRCheckResult {
  const roundedReps = Math.round(reps);
  if (!exerciseName || weight <= 0 || roundedReps <= 0) {
    return { isPR: false, isRepPR: false, isOneRMPR: false, previousBestAtReps: null };
  }

  const record = prMap[exerciseName];
  const previousBestAtReps = record?.byReps[roundedReps] ?? null;
  const isRepPR = previousBestAtReps === null || weight > previousBestAtReps;

  const oneRM = calculateOneRM(weight, roundedReps);
  const isOneRMPR = !!record && oneRM > record.best1RM;

  return {
    isPR: isRepPR || isOneRMPR,
    isRepPR,
    isOneRMPR,
    previousBestAtReps,
  };
}
