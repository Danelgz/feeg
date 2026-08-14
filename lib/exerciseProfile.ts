// Lógica pura para la ficha de un ejercicio (pages/exercise-history.js): sesiones en las que
// aparece, filtrado por periodo y frecuencia. Sin React, sin DOM — misma convención que
// lib/exerciseStats.ts, de donde reutiliza detailsOf/seriesOf en vez de duplicar el fallback
// series/sets/completedSets de historiales antiguos.
import { calculateOneRM, detailsOf, seriesOf, type CompletedSeries, type CompletedWorkout } from "./exerciseStats";

export interface ExerciseSession {
  workoutId: number | string;
  workoutName: string;
  date: Date;
  series: CompletedSeries[];
  /** Mejor serie de la sesión por 1RM estimado — lo que se enseña en el log sin obligar a abrir
   *  el entreno completo para saber si mereció la pena. */
  bestSet: { weight: number; reps: number; oneRM: number } | null;
}

/** Todas las sesiones donde aparece este ejercicio, de más reciente a más antigua. */
export function getExerciseSessions(
  completedWorkouts: (CompletedWorkout & { id?: number | string; name?: string })[],
  exerciseName: string
): ExerciseSession[] {
  if (!completedWorkouts || !exerciseName) return [];

  const sessions: ExerciseSession[] = [];

  completedWorkouts.forEach((w) => {
    if (!w.completedAt) return;
    const detail = detailsOf(w).find((d) => (d.name || d.exercise) === exerciseName);
    if (!detail) return;
    const series = seriesOf(detail);
    if (series.length === 0) return;

    let bestSet: ExerciseSession["bestSet"] = null;
    series.forEach((s) => {
      const weight = Number(s.weight) || 0;
      const reps = Number(s.reps) || 0;
      if (weight <= 0 || reps <= 0) return;
      const oneRM = calculateOneRM(weight, reps);
      if (!bestSet || oneRM > bestSet.oneRM) bestSet = { weight, reps, oneRM };
    });

    sessions.push({
      workoutId: w.id as number | string,
      workoutName: w.name || "Entreno",
      date: new Date(w.completedAt),
      series,
      bestSet,
    });
  });

  return sessions.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** `days: null` = sin límite ("Siempre"). */
export function filterSessionsByPeriod(sessions: ExerciseSession[], days: number | null): ExerciseSession[] {
  if (!days) return sessions;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => s.date.getTime() >= cutoff);
}

export interface RepRecord {
  reps: number;
  weight: number;
  date: Date;
}

/**
 * Mejor peso a cada número de repeticiones, CON la fecha en la que se consiguió — a diferencia de
 * computePersonalRecords (lib/exerciseStats.ts), que da el récord actual pero no cuándo se batió.
 * Recorre en orden cronológico y solo actualiza la fecha cuando el peso mejora, igual que
 * computePRTimeline hace para el 1RM global.
 */
export function computeRepRecordsWithDates(
  completedWorkouts: (CompletedWorkout & { id?: number | string })[],
  exerciseName: string
): RepRecord[] {
  const sorted = [...(completedWorkouts || [])]
    .filter((w) => w.completedAt)
    .sort((a, b) => new Date(a.completedAt as string).getTime() - new Date(b.completedAt as string).getTime());

  const byReps: Record<number, RepRecord> = {};

  sorted.forEach((w) => {
    const detail = detailsOf(w).find((d) => (d.name || d.exercise) === exerciseName);
    if (!detail) return;
    seriesOf(detail).forEach((s) => {
      const weight = Number(s.weight) || 0;
      const reps = Math.round(Number(s.reps) || 0);
      if (weight <= 0 || reps <= 0) return;
      if (!byReps[reps] || byReps[reps].weight < weight) {
        byReps[reps] = { reps, weight, date: new Date(w.completedAt as string) };
      }
    });
  });

  return Object.values(byReps).sort((a, b) => a.reps - b.reps);
}

export interface SessionFrequency {
  totalSessions: number;
  /** Sesiones por semana en las últimas 8 semanas — una racha reciente dice más de si un
   *  ejercicio está en rotación activa que la media histórica completa, que un parón largo no
   *  mueve nada si el usuario lleva años entrenando. */
  perWeekRecent: number;
}

const RECENT_WEEKS = 8;

export function computeSessionFrequency(sessions: ExerciseSession[]): SessionFrequency {
  const cutoff = Date.now() - RECENT_WEEKS * 7 * 24 * 60 * 60 * 1000;
  const recentCount = sessions.filter((s) => s.date.getTime() >= cutoff).length;
  return {
    totalSessions: sessions.length,
    perWeekRecent: Math.round((recentCount / RECENT_WEEKS) * 10) / 10,
  };
}
