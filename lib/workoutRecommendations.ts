import type { CompletedSeries, CompletedWorkout } from "./exerciseStats";

export type ProgressionDecision = "increase" | "maintain" | "decrease";

export interface SetRecommendation {
  decision: ProgressionDecision;
  weight: number | null;
  reps: number | null;
  previousWeight: number | null;
  previousReps: number | null;
  previousRir: number | null;
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validDate(value: string | undefined): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/** Returns the most recent recorded series for an exercise, regardless of workout array order. */
export function getLatestExerciseSeries(
  workouts: CompletedWorkout[],
  exerciseName: string
): CompletedSeries[] | null {
  const candidates = (workouts || [])
    .filter((workout) => validDate(workout.completedAt) > 0)
    .sort((a, b) => validDate(b.completedAt) - validDate(a.completedAt));

  for (const workout of candidates) {
    const detail = (workout.exerciseDetails || workout.details || []).find(
      (entry) => (entry.name || entry.exercise) === exerciseName
    );
    if (detail?.series?.length) return detail.series;
  }

  return null;
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function progressionStep(weight: number): number {
  return roundToHalf(Math.max(1.25, weight * 0.025));
}

/**
 * Conservative double-progression recommendation.
 * RIR is optional so old workouts continue to work. RIR 0-1 means too close to failure,
 * RIR 3+ means the set was comfortable enough to progress.
 */
export function getSetRecommendation(
  previous: CompletedSeries | null | undefined,
  plannedReps: number | string,
  exerciseType: string = "weight_reps"
): SetRecommendation | null {
  if (!previous) return null;

  const previousWeight = numberOrNull(previous.weight);
  const previousReps = numberOrNull(previous.reps);
  if (previousReps === null || previousReps <= 0) return null;

  const targetReps = numberOrNull(plannedReps) || previousReps;
  const previousRir = numberOrNull((previous as CompletedSeries & { rir?: number | string }).rir);

  if (exerciseType === "reps" || exerciseType === "time") {
    return {
      decision: "maintain",
      weight: previousWeight,
      reps: previousReps,
      previousWeight,
      previousReps,
      previousRir,
    };
  }

  let decision: ProgressionDecision = "maintain";
  if (previousRir !== null && previousRir <= 1 && previousReps < targetReps && previousWeight && previousWeight > 0) {
    decision = "decrease";
  } else if (
    (previousRir !== null && previousRir >= 3) ||
    (previousRir === null && previousReps >= Math.max(10, targetReps))
  ) {
    decision = "increase";
  }

  const weight = previousWeight === null ? null : decision === "increase"
    ? roundToHalf(previousWeight + progressionStep(previousWeight))
    : decision === "decrease"
      ? roundToHalf(Math.max(0, previousWeight * 0.95))
      : previousWeight;

  return {
    decision,
    weight,
    reps: decision === "maintain" ? Math.max(previousReps, targetReps) : previousReps,
    previousWeight,
    previousReps,
    previousRir,
  };
}
