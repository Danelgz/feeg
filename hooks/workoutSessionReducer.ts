// Reducer puro del motor de sesión de entrenamiento — sin React, sin DOM (salvo crypto.randomUUID,
// disponible en navegador y Node). Sustituye los 4 mapas paralelos "exIdx-serieIdx" de la
// implementación anterior por un único árbol indexado por uid estable: borrar/reordenar nunca
// desincroniza nada porque no hay ningún índice externo que reindexar.

import type { PRCheckResult, PRTier, PRTypeResult } from "../lib/exerciseStats";

export type SeriesType = "N" | "W" | "D";
export type WorkoutStatus = "preview" | "ongoing" | "finished";

export interface SeriesEntry {
  uid: string;
  type: SeriesType;
  reps: number | string;
  weight: number | string;
  completed: boolean;
  /** Récord genuino (no cuenta la primera vez que se registra el ejercicio). */
  isPR: boolean;
  isFirstEver: boolean;
  prTier: PRTier | null;
  /** Uno por cada tipo de récord conseguido (peso, reps, 1RM, volumen de la serie). */
  prTypes: PRTypeResult[];
}

export interface ExerciseSession {
  uid: string;
  name: string;
  muscleGroup: string;
  exerciseType: "weight_reps" | "reps" | "time";
  unit?: string;
  restSeconds: number;
  notes: string;
  series: SeriesEntry[];
}

export interface WorkoutSessionState {
  workoutId: string;
  sourceRoutineId: string | number | null;
  name: string;
  status: WorkoutStatus;
  startedAt: number | null;
  restEndsAt: number | null;
  restForExerciseUid: string | null;
  exercises: ExerciseSession[];
}

function makeUid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `uid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createSeries(overrides: Partial<SeriesEntry> = {}): SeriesEntry {
  return {
    uid: makeUid(),
    type: "N",
    reps: "",
    weight: "",
    completed: false,
    isPR: false,
    isFirstEver: false,
    prTier: null,
    prTypes: [],
    ...overrides,
  };
}

export function createExerciseFromCatalog(
  exercise: { name: string; type?: string; unit?: string },
  muscleGroup: string,
  restSeconds = 60
): ExerciseSession {
  return {
    uid: makeUid(),
    name: exercise.name,
    muscleGroup,
    exerciseType: (exercise.type as ExerciseSession["exerciseType"]) || "weight_reps",
    unit: exercise.unit,
    restSeconds,
    notes: "",
    series: [createSeries()],
  };
}

export function createEmptySession(workoutId: string): WorkoutSessionState {
  return {
    workoutId,
    sourceRoutineId: null,
    name: "",
    status: "preview",
    startedAt: null,
    restEndsAt: null,
    restForExerciseUid: null,
    exercises: [],
  };
}

/** Construye la sesión inicial a partir de una rutina guardada (routine.exercises[].series ya existentes). */
export function createSessionFromRoutine(
  workoutId: string,
  routine: { id?: string | number; name: string; exercises: any[] }
): WorkoutSessionState {
  return {
    workoutId,
    sourceRoutineId: routine.id ?? null,
    name: routine.name || "",
    status: "preview",
    startedAt: null,
    restEndsAt: null,
    restForExerciseUid: null,
    exercises: (routine.exercises || []).map((ex) => ({
      uid: makeUid(),
      name: ex.name,
      muscleGroup: ex.group || ex.muscleGroup || "",
      exerciseType: ex.type || "weight_reps",
      unit: ex.unit,
      restSeconds: ex.rest ?? 60,
      notes: ex.notes || "",
      series: (ex.series || []).map((s: any) =>
        createSeries({ type: s.type || "N", reps: s.reps ?? "", weight: s.weight ?? "" })
      ),
    })),
  };
}

export type WorkoutSessionAction =
  | { type: "RESTORE"; state: WorkoutSessionState }
  | { type: "SET_NAME"; name: string }
  | { type: "START_WORKOUT" }
  | { type: "ADD_EXERCISE"; exercise: ExerciseSession; substituteUid?: string | null }
  | { type: "REMOVE_EXERCISE"; exerciseUid: string }
  | { type: "ADD_SERIES"; exerciseUid: string; duplicateLast?: boolean }
  | { type: "REMOVE_SERIES"; exerciseUid: string; serieUid: string }
  | { type: "UPDATE_SERIES_FIELD"; exerciseUid: string; serieUid: string; field: "reps" | "weight"; value: number | string }
  | { type: "SET_SERIES_TYPE"; exerciseUid: string; serieUid: string; seriesType: SeriesType }
  | { type: "TOGGLE_SERIES_COMPLETE"; exerciseUid: string; serieUid: string; prResult: PRCheckResult | null }
  | { type: "SET_EXERCISE_REST"; exerciseUid: string; restSeconds: number }
  | { type: "SET_EXERCISE_NOTES"; exerciseUid: string; notes: string }
  | { type: "ADJUST_REST"; deltaSeconds: number }
  | { type: "STOP_REST" }
  | { type: "FINISH" }
  | { type: "REOPEN_PREVIEW" };

export function workoutSessionReducer(
  state: WorkoutSessionState,
  action: WorkoutSessionAction
): WorkoutSessionState {
  switch (action.type) {
    case "RESTORE":
      return action.state;

    case "SET_NAME":
      return { ...state, name: action.name };

    case "START_WORKOUT":
      if (state.status === "ongoing") return state;
      return { ...state, status: "ongoing", startedAt: state.startedAt ?? Date.now() };

    case "ADD_EXERCISE": {
      if (action.substituteUid) {
        return {
          ...state,
          exercises: state.exercises.map((ex) =>
            ex.uid !== action.substituteUid ? ex : action.exercise
          ),
        };
      }
      return { ...state, exercises: [...state.exercises, action.exercise] };
    }

    case "REMOVE_EXERCISE":
      return {
        ...state,
        exercises: state.exercises.filter((ex) => ex.uid !== action.exerciseUid),
        restForExerciseUid:
          state.restForExerciseUid === action.exerciseUid ? null : state.restForExerciseUid,
        restEndsAt: state.restForExerciseUid === action.exerciseUid ? null : state.restEndsAt,
      };

    case "ADD_SERIES": {
      return {
        ...state,
        exercises: state.exercises.map((ex) => {
          if (ex.uid !== action.exerciseUid) return ex;
          const last = ex.series[ex.series.length - 1];
          const newSerie =
            action.duplicateLast && last
              ? createSeries({ type: last.type, reps: last.reps, weight: last.weight })
              : createSeries();
          return { ...ex, series: [...ex.series, newSerie] };
        }),
      };
    }

    case "REMOVE_SERIES":
      return {
        ...state,
        exercises: state.exercises.map((ex) =>
          ex.uid !== action.exerciseUid
            ? ex
            : { ...ex, series: ex.series.filter((s) => s.uid !== action.serieUid) }
        ),
      };

    case "UPDATE_SERIES_FIELD":
      return {
        ...state,
        exercises: state.exercises.map((ex) =>
          ex.uid !== action.exerciseUid
            ? ex
            : {
                ...ex,
                series: ex.series.map((s) =>
                  s.uid !== action.serieUid ? s : { ...s, [action.field]: action.value }
                ),
              }
        ),
      };

    case "SET_SERIES_TYPE":
      return {
        ...state,
        exercises: state.exercises.map((ex) =>
          ex.uid !== action.exerciseUid
            ? ex
            : {
                ...ex,
                series: ex.series.map((s) =>
                  s.uid !== action.serieUid ? s : { ...s, type: action.seriesType }
                ),
              }
        ),
      };

    case "TOGGLE_SERIES_COMPLETE": {
      let targetExercise: ExerciseSession | undefined;
      let willBeCompleted = false;

      const exercises = state.exercises.map((ex) => {
        if (ex.uid !== action.exerciseUid) return ex;
        targetExercise = ex;
        return {
          ...ex,
          series: ex.series.map((s) => {
            if (s.uid !== action.serieUid) return s;
            willBeCompleted = !s.completed;
            const pr = willBeCompleted ? action.prResult : null;
            return {
              ...s,
              completed: willBeCompleted,
              isPR: pr?.isPR ?? false,
              isFirstEver: pr?.isFirstEver ?? false,
              prTier: pr?.tier ?? null,
              prTypes: pr?.types ?? [],
            };
          }),
        };
      });

      if (!targetExercise) return state;

      if (willBeCompleted) {
        return {
          ...state,
          exercises,
          restEndsAt: Date.now() + targetExercise.restSeconds * 1000,
          restForExerciseUid: targetExercise.uid,
        };
      }

      // Al desmarcar: si el descanso activo era el de este ejercicio, se cancela.
      const wasRestingThisExercise = state.restForExerciseUid === targetExercise.uid;
      return {
        ...state,
        exercises,
        restEndsAt: wasRestingThisExercise ? null : state.restEndsAt,
        restForExerciseUid: wasRestingThisExercise ? null : state.restForExerciseUid,
      };
    }

    case "SET_EXERCISE_REST":
      return {
        ...state,
        exercises: state.exercises.map((ex) =>
          ex.uid !== action.exerciseUid ? ex : { ...ex, restSeconds: action.restSeconds }
        ),
      };

    case "SET_EXERCISE_NOTES":
      return {
        ...state,
        exercises: state.exercises.map((ex) =>
          ex.uid !== action.exerciseUid ? ex : { ...ex, notes: action.notes }
        ),
      };

    case "ADJUST_REST":
      if (!state.restEndsAt) return state;
      return {
        ...state,
        restEndsAt: Math.max(Date.now(), state.restEndsAt + action.deltaSeconds * 1000),
      };

    case "STOP_REST":
      return { ...state, restEndsAt: null, restForExerciseUid: null };

    case "FINISH":
      return { ...state, status: "finished" };

    case "REOPEN_PREVIEW":
      return { ...state, status: "preview", startedAt: null };

    default:
      return state;
  }
}
