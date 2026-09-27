// "¿Qué me toca ahora?" durante el descanso: la siguiente serie sin completar. Primero se busca en
// el ejercicio del que se está descansando (lo normal es seguir con él) y, si ya está terminado,
// en los siguientes en orden y por último en los anteriores (alguno que se saltó).

export interface NextSetSerie {
  completed?: boolean;
  weight?: number | string | null;
  reps?: number | string | null;
  type?: string;
}

export interface NextSetExercise {
  uid: string;
  name: string;
  series: NextSetSerie[];
}

export interface NextSet {
  exerciseUid: string;
  exerciseName: string;
  /** Posición de la serie dentro del ejercicio, empezando en 1. */
  setNumber: number;
  totalSets: number;
  weight: number | string | null;
  reps: number | string | null;
  type: string;
  /** true si es de otro ejercicio distinto al del descanso. */
  changesExercise: boolean;
}

export function findNextSet(exercises: NextSetExercise[], restingExerciseUid?: string | null): NextSet | null {
  if (!exercises.length) return null;
  const start = Math.max(0, exercises.findIndex((ex) => ex.uid === restingExerciseUid));
  const order = [...exercises.slice(start), ...exercises.slice(0, start)];

  for (const ex of order) {
    const index = ex.series.findIndex((s) => !s.completed);
    if (index === -1) continue;
    const serie = ex.series[index];
    return {
      exerciseUid: ex.uid,
      exerciseName: ex.name,
      setNumber: index + 1,
      totalSets: ex.series.length,
      weight: serie.weight ?? null,
      reps: serie.reps ?? null,
      type: serie.type || "N",
      changesExercise: Boolean(restingExerciseUid) && ex.uid !== restingExerciseUid,
    };
  }
  return null;
}

const present = (v: number | string | null) => v !== null && v !== undefined && v !== "";

/** "80 kg × 8", "× 8", "80 kg" o "" según lo que haya apuntado. */
export function formatNextSetLoad(next: Pick<NextSet, "weight" | "reps">): string {
  const w = present(next.weight) ? `${String(next.weight).replace(".", ",")} kg` : "";
  const r = present(next.reps) ? `× ${next.reps}` : "";
  return [w, r].filter(Boolean).join(" ");
}
