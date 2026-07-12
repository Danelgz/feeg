// Hook del motor de sesión en modo "en vivo" (empty.js, [id].js): timer por ancla epoch,
// persistencia debounced en localStorage, detección de PR, corrección de Page Visibility.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  workoutSessionReducer,
  createEmptySession,
  createSessionFromRoutine,
  type WorkoutSessionState,
  type ExerciseSession,
  type SeriesType,
} from "./workoutSessionReducer";
import { loadSnapshot, saveSnapshot, clearSnapshot } from "../lib/workoutStorage";
import {
  computePersonalRecords,
  computeWorkoutTotals,
  checkForNewPR,
  weightUnitFor,
  type PersonalRecordsMap,
  type CompletedWorkout,
  type PRTier,
} from "../lib/exerciseStats";
import { playPRChime } from "../lib/prSound";

export interface UseWorkoutSessionOptions {
  workoutId: string;
  routine?: { id?: string | number; name: string; exercises: any[] } | null;
  completedWorkouts: CompletedWorkout[];
  /** Si el usuario ha desactivado el sonido de récord personal en ajustes. Por defecto activo. */
  soundEnabled?: boolean;
}

export interface PRToastItem {
  id: string;
  exerciseName: string;
  tier: PRTier;
  isFirstEver: boolean;
  isRepPR: boolean;
  isOneRMPR: boolean;
  reps: number;
  weight: number;
  weightUnit: string;
  deltaWeight: number | null;
  deltaOneRMPercent: number | null;
  /** Peso anterior a este mismo número de reps, cuando existe — para el detalle "antes / ahora". */
  previousWeight: number | null;
}

export function useWorkoutSession({
  workoutId,
  routine,
  completedWorkouts,
  soundEnabled = true,
}: UseWorkoutSessionOptions) {
  const [state, dispatch] = useReducer(
    workoutSessionReducer,
    undefined as unknown as WorkoutSessionState,
    () =>
      loadSnapshot(workoutId) ??
      (routine ? createSessionFromRoutine(workoutId, routine) : createEmptySession(workoutId))
  );

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // `routine` puede llegar tarde (viene del contexto, que carga de forma asíncrona) — no está
  // garantizado en el primer render. Si al llegar la sesión sigue "en blanco" (no se restauró
  // nada real desde localStorage), se hidrata entonces. Si ya había una sesión en curso
  // restaurada, nunca se pisa. Se intenta como mucho una vez.
  const hydratedFromRoutineRef = useRef(false);
  useEffect(() => {
    if (hydratedFromRoutineRef.current || !routine) return;
    hydratedFromRoutineRef.current = true;
    const isBlank = state.status === "preview" && state.exercises.length === 0 && state.sourceRoutineId === null;
    if (isBlank) {
      dispatch({ type: "RESTORE", state: createSessionFromRoutine(workoutId, routine) });
    }
    // eslint-disable-next-line
  }, [routine]);

  const personalRecords: PersonalRecordsMap = useMemo(
    () => computePersonalRecords(completedWorkouts),
    [completedWorkouts]
  );

  // Tick de reloj — solo fuerza re-render mientras el entreno está en curso.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (state.status !== "ongoing") return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [state.status]);

  const elapsedSeconds = state.startedAt
    ? Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000))
    : 0;
  const restRemainingSeconds = state.restEndsAt
    ? Math.max(0, Math.ceil((state.restEndsAt - Date.now()) / 1000))
    : 0;
  const restActive = !!state.restEndsAt && restRemainingSeconds > 0;

  // El descanso llega a 0 solo: vibra y limpia el estado (auto-limitado, restEndsAt pasa a null).
  useEffect(() => {
    if (state.restEndsAt && restRemainingSeconds === 0) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch (_) {
          /* no soportado, ignorar */
        }
      }
      dispatch({ type: "STOP_REST" });
    }
  }, [state.restEndsAt, restRemainingSeconds]);

  // Persistencia debounced. Nunca depende del timer (elapsedSeconds/restRemainingSeconds no
  // están en las deps) para que el debounce pueda asentarse — ver arquitectura en el plan.
  useEffect(() => {
    const timeout = setTimeout(() => saveSnapshot(stateRef.current), 500);
    return () => clearTimeout(timeout);
  }, [state.exercises, state.name, state.status, state.workoutId, state.startedAt]);

  // Guardado garantizado ante cierre/cambio de pestaña/desmontaje.
  useEffect(() => {
    const flush = () => saveSnapshot(stateRef.current);
    const onVisibilityHidden = () => {
      if (document.hidden) flush();
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityHidden);
    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityHidden);
    };
  }, []);

  // Al volver de segundo plano, refresca de inmediato en vez de esperar al próximo tick.
  useEffect(() => {
    const onVisibilityVisible = () => {
      if (!document.hidden) setTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onVisibilityVisible);
    return () => document.removeEventListener("visibilitychange", onVisibilityVisible);
  }, []);

  const start = useCallback(() => dispatch({ type: "START_WORKOUT" }), []);
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

  // Cola de avisos de récord personal — como máximo uno visible a la vez (nunca apilados).
  // El PR se calcula aquí (no en el reducer) porque el hook es quien necesita el resultado en
  // el momento del dispatch para encolar el toast y disparar sonido/vibración sin re-derivarlo.
  // El temporizador de cuánto se mantiene visible vive en el propio PRToast (no aquí), porque
  // ahora es interactivo: al hacer clic para ver el detalle, la desaparición automática se pausa.
  const [prToastQueue, setPRToastQueue] = useState<PRToastItem[]>([]);
  const prToast = prToastQueue[0] ?? null;

  const dismissPRToast = useCallback(() => {
    setPRToastQueue((q) => q.slice(1));
  }, []);

  const toggleSeriesComplete = useCallback(
    (exerciseUid: string, serieUid: string) => {
      const exercise = stateRef.current.exercises.find((ex) => ex.uid === exerciseUid);
      const serie = exercise?.series.find((s) => s.uid === serieUid);
      const willBeCompleted = !!serie && !serie.completed;

      const prResult =
        willBeCompleted && exercise && serie && serie.type !== "W"
          ? checkForNewPR(exercise.name, Number(serie.reps), Number(serie.weight), personalRecords)
          : null;

      dispatch({ type: "TOGGLE_SERIES_COMPLETE", exerciseUid, serieUid, prResult });

      if (exercise && serie && prResult && (prResult.isPR || prResult.isFirstEver)) {
        const weight = Number(serie.weight);
        setPRToastQueue((q) => [
          ...q,
          {
            id: `${serieUid}_${Date.now()}`,
            exerciseName: exercise.name,
            tier: prResult.tier ?? "minor",
            isFirstEver: prResult.isFirstEver,
            isRepPR: prResult.isRepPR,
            isOneRMPR: prResult.isOneRMPR,
            reps: Number(serie.reps),
            weight,
            weightUnit: weightUnitFor(exercise),
            deltaWeight: prResult.deltaWeight,
            deltaOneRMPercent: prResult.deltaOneRMPercent,
            previousWeight: prResult.deltaWeight != null ? weight - prResult.deltaWeight : null,
          },
        ]);

        if (prResult.isPR) {
          if (soundEnabled) playPRChime(prResult.tier === "historic" ? "historic" : "minor");
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate([40, 60, 20]);
            } catch (_) {
              /* no soportado, ignorar */
            }
          }
        }
      }
    },
    [personalRecords, soundEnabled]
  );
  const setExerciseRest = useCallback(
    (exerciseUid: string, restSeconds: number) =>
      dispatch({ type: "SET_EXERCISE_REST", exerciseUid, restSeconds }),
    []
  );
  const setExerciseNotes = useCallback(
    (exerciseUid: string, notes: string) => dispatch({ type: "SET_EXERCISE_NOTES", exerciseUid, notes }),
    []
  );
  const adjustRest = useCallback(
    (deltaSeconds: number) => dispatch({ type: "ADJUST_REST", deltaSeconds }),
    []
  );
  const stopRest = useCallback(() => dispatch({ type: "STOP_REST" }), []);
  const finish = useCallback(() => dispatch({ type: "FINISH" }), []);
  const discard = useCallback(() => {
    clearSnapshot();
  }, []);

  const totals = useMemo(
    () => computeWorkoutTotals(state.exercises, { onlyCompleted: true }),
    [state.exercises]
  );

  return {
    state,
    dispatch,
    personalRecords,
    elapsedSeconds,
    restRemainingSeconds,
    restActive,
    totals,
    prToast,
    dismissPRToast,
    actions: {
      start,
      setName,
      addExercise,
      removeExercise,
      addSeries,
      removeSeries,
      updateSeriesField,
      setSeriesType,
      toggleSeriesComplete,
      setExerciseRest,
      setExerciseNotes,
      adjustRest,
      stopRest,
      finish,
      discard,
    },
  };
}
