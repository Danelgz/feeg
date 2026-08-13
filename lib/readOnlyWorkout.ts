import { getExerciseInfo } from "./exerciseStats";

export interface ReadOnlyWorkoutSeries {
  uid: string;
  type: string;
  reps: number | string;
  weight: number | string;
  completed: boolean;
  isPR: boolean;
  isFirstEver: boolean;
  prTier: null;
  prTypes: never[];
  rir: number | string;
}

export interface ReadOnlyWorkoutExercise {
  uid: string;
  name: string;
  muscleGroup: string;
  exerciseType: "weight_reps" | "reps" | "time";
  unit?: string;
  restSeconds: number;
  notes: string;
  series: ReadOnlyWorkoutSeries[];
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asType(value: unknown): "weight_reps" | "reps" | "time" {
  return value === "time" || value === "reps" || value === "weight_reps" ? value : "weight_reps";
}

function seriesFor(detail: Record<string, unknown>): Record<string, unknown>[] {
  const candidates = [detail.series, detail.sets, detail.completedSets];
  const populated = candidates.find((candidate) => Array.isArray(candidate) && candidate.length > 0);
  const selected = populated || candidates.find(Array.isArray);
  return Array.isArray(selected) ? selected.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];
}

/** Converts persisted completed-workout data into the shape consumed by the live workout cards. */
export function toReadOnlyWorkoutExercises(workout: unknown): ReadOnlyWorkoutExercise[] {
  if (!workout || typeof workout !== "object") return [];
  const source = workout as Record<string, unknown>;
  const rawDetails = Array.isArray(source.exerciseDetails) && source.exerciseDetails.length > 0
    ? source.exerciseDetails
    : source.details;
  if (!Array.isArray(rawDetails)) return [];

  return rawDetails.map((rawDetail, exerciseIndex) => {
    const detail = rawDetail && typeof rawDetail === "object" ? rawDetail as Record<string, unknown> : {};
    const name = asText(detail.name) || asText(detail.exercise) || `Ejercicio ${exerciseIndex + 1}`;
    const info = getExerciseInfo(name);
    const rawType = detail.exerciseType || info?.type;
    const rawSeries = seriesFor(detail);

    return {
      uid: `readonly-exercise-${exerciseIndex}-${name}`,
      name,
      muscleGroup: asText(detail.muscleGroup) || asText(detail.group) || info?.group || "",
      exerciseType: asType(rawType),
      unit: asText(detail.unit) || info?.unit,
      restSeconds: Number(detail.restSeconds) > 0 ? Number(detail.restSeconds) : 60,
      notes: asText(detail.notes),
      series: rawSeries.map((rawSerie, seriesIndex) => ({
        uid: `readonly-series-${exerciseIndex}-${seriesIndex}`,
        type: asText(rawSerie.type) || "N",
        reps: (rawSerie.reps as number | string | undefined) ?? "",
        weight: (rawSerie.weight as number | string | undefined) ?? "",
        completed: true,
        isPR: false,
        isFirstEver: false,
        prTier: null,
        prTypes: [],
        rir: (rawSerie.rir as number | string | undefined) ?? "",
      })),
    };
  });
}
