// Traduce el `pendingAction` que devuelve pages/api/ai-chat.js (payload de una herramienta
// propose_*, ver lib/aiTools.ts) a los mismos objetos planos que ya escriben
// pages/routines/create.js y pages/routines/empty.js — así el chat reutiliza exactamente los
// mutators normales de UserContext (saveRoutine/updateRoutine/saveCompletedWorkout) en vez de
// inventar una vía de escritura paralela. Nada de aquí toca Firestore directamente: solo
// construye el objeto que el llamador debe pasarle al mutator correspondiente.
import { computeWorkoutTotals } from "./exerciseStats";

export interface ProposedExerciseItem {
  name: string;
  group: string;
  type?: string;
  sets?: number;
  reps?: number;
  rest?: number;
}

export interface RoutineLike {
  id: string | number;
  name: string;
  exercises: any[];
}

function buildExercisesFromProposal(items: ProposedExerciseItem[] | undefined) {
  return (items || []).map((ex) => ({
    name: ex.name,
    group: ex.group || "General",
    type: ex.type || "weight_reps",
    rest: Number(ex.rest) || 90,
    series: Array.from({ length: Math.max(1, Number(ex.sets) || 3) }).map(() => ({
      reps: Number(ex.reps) || 10,
      weight: 0,
      type: "N",
    })),
  }));
}

export function buildCreateRoutine(payload: { name?: string; exercises?: ProposedExerciseItem[] }) {
  return {
    id: Date.now(),
    name: payload.name || "Rutina propuesta por IA",
    exercises: buildExercisesFromProposal(payload.exercises),
  };
}

/** Igual que buildCreateRoutine — una sesión rápida es, en el modelo de datos actual, una rutina
 * más que el usuario puede iniciar al instante desde Rutinas (no hay un flujo de "empezar ya"
 * separado, así que no se inventa uno solo para esto). */
export const buildQuickWorkoutRoutine = buildCreateRoutine;

/** Busca la rutina objetivo por id (preferente) o por nombre (case-insensitive) — el modelo a
 * veces solo tiene el nombre a mano si no llamó a get_routines primero. */
export function findTargetRoutine(
  routines: RoutineLike[],
  payload: { routineId?: string | number; routineName?: string }
): RoutineLike | null {
  if (payload.routineId != null) {
    const byId = routines.find((r) => String(r.id) === String(payload.routineId));
    if (byId) return byId;
  }
  if (payload.routineName) {
    const name = payload.routineName.trim().toLowerCase();
    const byName = routines.find((r) => (r.name || "").trim().toLowerCase() === name);
    if (byName) return byName;
  }
  return null;
}

export function buildModifyRoutine(
  routine: RoutineLike,
  payload: { name?: string; exercises?: ProposedExerciseItem[] }
) {
  return {
    ...routine,
    name: payload.name || routine.name,
    exercises: buildExercisesFromProposal(payload.exercises),
  };
}

export function buildSubstituteExercise(
  routine: RoutineLike,
  payload: { oldExerciseName?: string; newExerciseName?: string; newExerciseGroup?: string }
) {
  const oldName = (payload.oldExerciseName || "").trim().toLowerCase();
  const exercises = routine.exercises.map((ex: any) =>
    (ex.name || "").trim().toLowerCase() === oldName
      ? { ...ex, name: payload.newExerciseName, group: payload.newExerciseGroup || ex.group }
      : ex
  );
  return { ...routine, exercises };
}

/** Mismo shape que construye handleSaveFinishedRoutine en pages/routines/empty.js al terminar
 * una sesión real, para que una serie registrada por chat conviva sin fricción con el resto del
 * historial (estadísticas, racha, PRs recalculados retroactivamente). */
export function buildLogSetWorkout(payload: { exerciseName?: string; group?: string; reps?: number; weight?: number }) {
  const series = [{ reps: Number(payload.reps) || 0, weight: Number(payload.weight) || 0, type: "N" }];
  const totals = computeWorkoutTotals([{ series }]);

  return {
    id: Date.now(),
    name: `Serie registrada por chat: ${payload.exerciseName || ""}`.trim(),
    comments: "Añadido desde el Coach IA",
    completedAt: new Date().toISOString(),
    elapsedTime: 0,
    totalTime: 0,
    exercises: 1,
    series: totals.totalSeries,
    totalReps: totals.totalReps,
    totalVolume: totals.totalVolume,
    exerciseDetails: [{ name: payload.exerciseName, muscleGroup: payload.group || "", series }],
  };
}
