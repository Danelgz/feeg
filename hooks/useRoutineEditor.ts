// Hook del motor de sesión en modo "plantilla" (create.js): mismo reducer que useWorkoutSession,
// sin timer, sin persistencia de sesión en localStorage, sin detección de PR.
import { useCallback, useReducer } from "react";
import {
  workoutSessionReducer,
  createEmptySession,
  createSessionFromRoutine,
  type WorkoutSessionState,
  type ExerciseSession,
  type SeriesType,
} from "./workoutSessionReducer";

export interface UseRoutineEditorOptions {
  editorId: string;
  routine?: { id?: string | number; name: string; exercises: any[] } | null;
}

export function useRoutineEditor({ editorId, routine }: UseRoutineEditorOptions) {
  const [state, dispatch] = useReducer(
    workoutSessionReducer,
    undefined as unknown as WorkoutSessionState,
    () => (routine ? createSessionFromRoutine(editorId, routine) : createEmptySession(editorId))
  );

  const setName = useCallback((name: string) => dispatch({ type: "SET_NAME", name }), []);
  const addExercise = useCallback(
    (exercise: ExerciseSession, substituteUid?: string | null) =>
      dispatch({ type: "ADD_EXERCISE", exercise, substituteUid: substituteUid ?? null }),
    []
  );
  const removeExercise = useCallback(
    (exerciseUid: string) => dispatch({ type: "REMOVE_EXERCISE", exerciseUid }),
    []
  );
  const addSeries = useCallback(
    (exerciseUid: string, duplicateLast = true) =>
      dispatch({ type: "ADD_SERIES", exerciseUid, duplicateLast }),
    []
  );
  const removeSeries = useCallback(
    (exerciseUid: string, serieUid: string) => dispatch({ type: "REMOVE_SERIES", exerciseUid, serieUid }),
    []
  );
  const updateSeriesField = useCallback(
    (exerciseUid: string, serieUid: string, field: "reps" | "weight", value: number | string) =>
      dispatch({ type: "UPDATE_SERIES_FIELD", exerciseUid, serieUid, field, value }),
    []
  );
  const setSeriesType = useCallback(
    (exerciseUid: string, serieUid: string, seriesType: SeriesType) =>
      dispatch({ type: "SET_SERIES_TYPE", exerciseUid, serieUid, seriesType }),
    []
  );
  const setExerciseRest = useCallback(
    (exerciseUid: string, restSeconds: number) =>
      dispatch({ type: "SET_EXERCISE_REST", exerciseUid, restSeconds }),
    []
  );

  return {
    state,
    dispatch,
    actions: {
      setName,
      addExercise,
      removeExercise,
      addSeries,
      removeSeries,
      updateSeriesField,
      setSeriesType,
      setExerciseRest,
    },
  };
}
