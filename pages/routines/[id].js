import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import ExerciseSelector from "../../components/ExerciseSelector";
import { useWorkoutSession } from "../../hooks/useWorkoutSession";
import { createExerciseFromCatalog } from "../../hooks/workoutSessionReducer";
import { getExerciseInfo, computeWorkoutTotals, buildPRRecordsFromExercises, checkWorkoutVolumePR } from "../../lib/exerciseStats";
import { getLatestExerciseSeries } from "../../lib/workoutRecommendations";
import { getWorkoutTokens } from "../../lib/tokens";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { ConfirmModal, Spinner } from "../../components/ui";
import { ExerciseCard, WorkoutHeader, WorkoutStatsBar, WorkoutExercisePager, FloatingRestTimer, WorkoutSummaryScreen, WorkoutFinishScreen, PRToast } from "../../components/workout";

export default function RoutineDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { routines: allRoutines, activeRoutine, startRoutine, endRoutine, saveCompletedWorkout, completedWorkouts, soundEnabled, t, language, updateRoutine, theme, user } = useUser();
  const isDark = theme === "dark";
  const tk = getWorkoutTokens();
  const workoutId = id ? id.toString() : "";

  const foundRoutine = useMemo(() => {
    if (!id || !allRoutines) return null;
    return allRoutines.find((r) => r.id.toString() === id.toString()) || null;
  }, [id, allRoutines]);

  const { state, actions, elapsedSeconds, restRemainingSeconds, restActive, totals, prToast, dismissPRToast } = useWorkoutSession({
    workoutId,
    routine: foundRoutine,
    completedWorkouts,
    soundEnabled,
  });

  // Snapshot de la rutina tal como estaba al empezar, para poder ofrecer "actualizar rutina
  // original" si el usuario añade ejercicios/series durante el entreno.
  const initialRoutineRef = useRef(null);
  useEffect(() => {
    if (!initialRoutineRef.current && foundRoutine) {
      initialRoutineRef.current = JSON.parse(JSON.stringify(foundRoutine));
    }
  }, [foundRoutine]);

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [substitutingUid, setSubstitutingUid] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [showRoutineActiveAlert, setShowRoutineActiveAlert] = useState(false);
  const [finishName, setFinishName] = useState("");
  const [finishComments, setFinishComments] = useState("");
  const [finishTotalTime, setFinishTotalTime] = useState(0);
  const [updateOriginalRoutine, setUpdateOriginalRoutine] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [finishedWorkout, setFinishedWorkout] = useState(null);
  const [sessionPRRecords, setSessionPRRecords] = useState([]);
  const [sessionWorkoutVolumeRecord, setSessionWorkoutVolumeRecord] = useState(null);

  // Salto automático al siguiente ejercicio: al completar la última serie pendiente de uno, el
  // pager avanza solo tras un pequeño respiro (deja verse el pulso del check antes de moverse).
  const pagerRef = useRef(null);
  const handleToggleComplete = (exercise, serieUid) => {
    const serie = exercise.series.find((s) => s.uid === serieUid);
    const willComplete = !!serie && !serie.completed;
    const wasLastPending = willComplete && exercise.series.every((s) => s.uid === serieUid || s.completed);
    actions.toggleSeriesComplete(exercise.uid, serieUid);
    if (wasLastPending) {
      window.setTimeout(() => pagerRef.current?.scrollToNext(), 650);
    }
  };

  // Duración configurada del descanso en curso (no cambia con los ajustes +/-10s manuales) —
  // sirve para pintar la barra de progreso del temporizador de descanso.
  const restingExercise = state.exercises.find((ex) => ex.uid === state.restForExerciseUid);
  const totalRestSeconds = restingExercise?.restSeconds || 0;

  // Red de seguridad: si el contexto global dice que esta rutina ya está activa pero el
  // snapshot local no se restauró, sincroniza.
  useEffect(() => {
    if (activeRoutine?.id?.toString?.() === workoutId && state.status === "preview" && state.exercises.length > 0) {
      actions.start();
    }
  }, [activeRoutine, workoutId]);

  const previousByName = useMemo(() => {
    const map = {};
    state.exercises.forEach((ex) => {
      const latestSeries = getLatestExerciseSeries(completedWorkouts || [], ex.name);
      if (latestSeries) map[ex.name] = latestSeries;
    });
    return map;
  }, [state.exercises, completedWorkouts]);

  const routineChanges = useMemo(() => {
    const initial = initialRoutineRef.current;
    if (!initial) return { exercises: 0, series: 0 };
    let addedExercises = 0;
    let addedSeries = 0;
    state.exercises.forEach((ex) => {
      const initialEx = initial.exercises.find((iEx) => iEx.name === ex.name);
      if (!initialEx) {
        addedExercises++;
      } else if (ex.series.length > initialEx.series.length) {
        addedSeries += ex.series.length - initialEx.series.length;
      }
    });
    return { exercises: addedExercises, series: addedSeries };
  }, [state.exercises, showFinishForm]);

  const handleStart = () => {
    if (activeRoutine && activeRoutine.id?.toString() !== workoutId) {
      setShowRoutineActiveAlert(true);
      return;
    }
    actions.start();
    startRoutine({ id: workoutId, name: foundRoutine?.name || state.name, path: `/routines/${workoutId}` });
  };

  const handleDiscard = () => {
    actions.discard();
    endRoutine();
    router.push("/routines");
  };

  const handleSelectExercise = (exercise) => {
    const info = getExerciseInfo(exercise.name);
    const muscleGroup = exercise.muscleGroup || info?.group || "";
    const newExercise = createExerciseFromCatalog(
      { name: exercise.name, type: exercise.type, unit: exercise.unit },
      muscleGroup,
      60
    );
    actions.addExercise(newExercise, substitutingUid);
    setShowExerciseSelector(false);
    setSubstitutingUid(null);
  };

  const openFinishForm = () => {
    setFinishName(state.name || foundRoutine?.name || "");
    setFinishTotalTime(Math.floor(elapsedSeconds / 60));
    setShowFinishForm(true);
  };

  const buildRoutineForSave = () => ({
    id: Number(id),
    name: state.name || foundRoutine?.name,
    exercises: state.exercises.map((ex) => ({
      name: ex.name,
      group: ex.muscleGroup,
      type: ex.exerciseType,
      unit: ex.unit,
      rest: ex.restSeconds,
      series: ex.series.map((s) => ({ reps: s.reps, weight: s.weight, type: s.type })),
    })),
  });

  const handleSaveFinishedRoutine = () => {
    setSavingWorkout(true);

    const exerciseDetails = state.exercises
      .map((ex) => {
        const completedSeries = ex.series.filter((s) => s.completed).map((s) => ({ reps: s.reps, weight: s.weight, type: s.type, rir: s.rir ?? "" }));
        if (completedSeries.length === 0) return null;
        return { name: ex.name, muscleGroup: ex.muscleGroup, series: completedSeries };
      })
      .filter(Boolean);

    const totalsCompleted = computeWorkoutTotals(
      exerciseDetails.map((ex) => ({ series: ex.series })),
      {}
    );
    const prRecords = buildPRRecordsFromExercises(state.exercises);
    const workoutVolumeRecord = checkWorkoutVolumePR(totalsCompleted.totalVolume, completedWorkouts);

    const completedWorkout = {
      id: Date.now(),
      name: finishName,
      comments: finishComments,
      completedAt: new Date().toISOString(),
      totalTime: Number(finishTotalTime) || 0,
      elapsedTime: elapsedSeconds,
      exercises: exerciseDetails.length,
      series: totalsCompleted.totalSeries,
      totalReps: totalsCompleted.totalReps,
      totalVolume: totalsCompleted.totalVolume,
      exerciseDetails,
    };

    saveCompletedWorkout(completedWorkout);
    if (updateOriginalRoutine) {
      updateRoutine(buildRoutineForSave());
    }
    actions.discard();
    endRoutine();
    actions.finish();
    setFinishedWorkout(completedWorkout);
    setSessionPRRecords(prRecords);
    setSessionWorkoutVolumeRecord(workoutVolumeRecord);
    setSavingWorkout(false);
  };

  if (!id || !allRoutines) {
    return (
      <Layout>
        <Spinner isDark={isDark} fullPage label={t("loading_routine")} />
      </Layout>
    );
  }

  if (!foundRoutine && state.exercises.length === 0 && state.status === "preview") {
    return (
      <Layout>
        <div style={{ padding: "20px" }}>
          <p style={{ color: isDark ? "#fff" : "#333" }}>{t("loading_routine")}</p>
        </div>
      </Layout>
    );
  }

  if (finishedWorkout) {
    return (
      <Layout hideBottomNav>
        <WorkoutSummaryScreen
          workout={finishedWorkout}
          prRecords={sessionPRRecords}
          workoutVolumeRecord={sessionWorkoutVolumeRecord}
          onDone={() => router.push("/routines?tab=completed")}
          t={t}
        />
      </Layout>
    );
  }

  if (showExerciseSelector) {
    return (
      <ExerciseSelector
        onSelectExercise={handleSelectExercise}
        onCancel={() => {
          setShowExerciseSelector(false);
          setSubstitutingUid(null);
        }}
      />
    );
  }

  if (state.status === "preview") {
    const previewExercises = foundRoutine?.exercises || [];
    return (
      <Layout>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h1 style={{ color: tk.text }}>{foundRoutine?.name}</h1>
          <p style={{ color: tk.textMuted, marginBottom: "20px" }}>
            {previewExercises.length} {t("exercises_count")} · {previewExercises.reduce((sum, ex) => sum + ex.series.length, 0)} {t("total_series")}
          </p>

          <div style={{ backgroundColor: tk.surface, border: `1px solid ${tk.border}`, borderRadius: tk.radius.md, padding: "20px", marginBottom: "20px" }}>
            <h2 style={{ marginTop: 0, color: tk.text }}>{t("workout_summary")}</h2>
            {previewExercises.map((exercise, idx) => {
              const info = getExerciseInfo(exercise.name);
              return (
                <div key={idx} style={{ backgroundColor: tk.surfaceAlt, padding: "12px", marginBottom: "10px", borderRadius: tk.radius.sm, border: `1px solid ${tk.border}` }}>
                  <h3 style={{ margin: "0 0 8px 0", color: tk.accent }}>{translateExerciseName(exercise.name, language)}</h3>
                  <p style={{ margin: 0, color: tk.textMuted }}>
                    {exercise.series.length} {t("series_label")} · {t("rest_between_series")} {exercise.rest}s
                  </p>
                  {exercise.series.map((serie, sIdx) => (
                    <div key={sIdx} style={{ fontSize: "0.9rem", color: tk.textFaint, marginLeft: "10px" }}>
                      {t("series_label")} {sIdx + 1}: {serie.reps} {info?.type === "time" ? "m" : t("reps_label")}
                      {(info?.type === "weight_reps" || !info?.type) && ` - ${serie.weight}${info?.unit === "lastre" ? "L" : "kg"}`}
                      {info?.type === "time" && ` - ${serie.weight}m`}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleStart}
            className="feeg-surface feeg-press feeg-hover"
            style={{
              padding: "12px 30px", fontSize: "1.1rem", border: "none", borderRadius: tk.radius.md, fontWeight: "600", cursor: "pointer",
              "--feeg-bg": tk.accent,
              "--feeg-fg": tk.onAccent,
              "--feeg-hover-bg": tk.accentHover,
              "--feeg-border-width": "0px",
            }}
          >
            {t("start_routine")}
          </button>
        </div>

        {showRoutineActiveAlert && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000, padding: "20px" }}>
            <div style={{ backgroundColor: tk.surface, borderRadius: tk.radius.lg, padding: "30px", width: "320px", maxWidth: "100%", textAlign: "center", border: `2px solid ${tk.danger}`, boxSizing: "border-box" }}>
              <h3 style={{ color: tk.text, margin: "0 0 15px 0" }}>{t("routine_already_active_title")}</h3>
              <p style={{ color: tk.textMuted, fontSize: "0.95rem", marginBottom: "25px", lineHeight: "1.4" }}>
                {t("routine_already_active_desc").replace("{name}", activeRoutine?.name || "")}
              </p>
              <button
                onClick={() => setShowRoutineActiveAlert(false)}
                className="feeg-surface feeg-press feeg-hover"
                style={{
                  width: "100%", padding: "12px", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer",
                  "--feeg-bg": tk.accent,
                  "--feeg-fg": tk.onAccent,
                  "--feeg-hover-bg": tk.accentHover,
                  "--feeg-border-width": "0px",
                }}
              >
                {t("understood")}
              </button>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  if (showFinishForm) {
    return (
      <Layout hideBottomNav>
        <WorkoutFinishScreen
          name={finishName}
          onNameChange={setFinishName}
          namePlaceholder={t("placeholder_workout_name")}
          comments={finishComments}
          onCommentsChange={setFinishComments}
          totalMinutes={finishTotalTime}
          onTotalMinutesChange={setFinishTotalTime}
          elapsedSeconds={elapsedSeconds}
          totals={totals}
          exerciseCount={state.exercises.length}
          routineChanges={routineChanges}
          updateOriginalRoutine={updateOriginalRoutine}
          onUpdateOriginalRoutineChange={setUpdateOriginalRoutine}
          savingWorkout={savingWorkout}
          onCancel={() => setShowFinishForm(false)}
          onSave={handleSaveFinishedRoutine}
          t={t}
        />
      </Layout>
    );
  }

  // ongoing
  return (
    <Layout hideBottomNav>
      <div className="feeg-active-workout-viewport" style={{ maxWidth: "900px", width: "100%", height: "100dvh", minHeight: 0, margin: "0 auto", display: "flex", flexDirection: "column", overflow: "hidden", touchAction: "pan-y", overscrollBehaviorX: "none" }}>
        <WorkoutHeader mode="live" title={state.name || foundRoutine?.name} onBack={() => setShowDiscardConfirm(true)} primaryLabel={t("finish_button")} onPrimaryAction={openFinishForm} />

        <WorkoutStatsBar mode="live" elapsedSeconds={elapsedSeconds} totalVolume={totals.totalVolume} totalSeries={totals.totalSeries} t={t} />

        <WorkoutExercisePager
          ref={pagerRef}
          exercises={state.exercises}
          renderExercise={(exercise) => (
            <ExerciseCard
              key={exercise.uid}
              exercise={exercise}
              mode="live"
              translate={t}
              translateExerciseName={(name) => translateExerciseName(name, language)}
              previousSeries={previousByName[exercise.name]}
              showRirPreference={user?.workoutPreferences?.showRir !== false}
              progressionMode={user?.workoutPreferences?.progressionMode || "all"}
              onUpdateField={(serieUid, field, value) => actions.updateSeriesField(exercise.uid, serieUid, field, value)}
              onRirChange={(serieUid, value) => actions.updateSeriesRir(exercise.uid, serieUid, value)}
              onToggleComplete={(serieUid) => handleToggleComplete(exercise, serieUid)}
              onSetSeriesType={(serieUid, type) => actions.setSeriesType(exercise.uid, serieUid, type)}
              onAddSeries={() => actions.addSeries(exercise.uid)}
              onRemoveSeries={(serieUid) => actions.removeSeries(exercise.uid, serieUid)}
              onSetRest={(seconds) => actions.setExerciseRest(exercise.uid, seconds)}
              onSetNotes={(notes) => actions.setExerciseNotes(exercise.uid, notes)}
              onSubstitute={() => {
                setSubstitutingUid(exercise.uid);
                setShowExerciseSelector(true);
              }}
              onDeleteExercise={() => actions.removeExercise(exercise.uid)}
              onOpenHistory={() => router.push(`/exercise-history?exercise=${encodeURIComponent(exercise.name)}`)}
            />
          )}
        />
      </div>

      <style>{`
        html, body { overflow: hidden; overscroll-behavior: none; }
        .feeg-active-workout-viewport { max-width: 100%; }
      `}</style>

      <FloatingRestTimer restActive={restActive} restRemainingSeconds={restRemainingSeconds} totalRestSeconds={totalRestSeconds} elapsedSeconds={elapsedSeconds} onAdjust={actions.adjustRest} onStop={actions.stopRest} t={t} />
      <PRToast item={prToast} t={t} onDismiss={dismissPRToast} />

      <ConfirmModal
        isDark
        open={showDiscardConfirm}
        title={t("cancel_workout_title")}
        description={t("cancel_workout_msg")}
        confirmLabel="Sí, cancelar"
        cancelLabel="No, continuar"
        danger
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </Layout>
  );
}
