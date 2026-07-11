import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import ExerciseSelector from "../../components/ExerciseSelector";
import { useWorkoutSession } from "../../hooks/useWorkoutSession";
import { createExerciseFromCatalog } from "../../hooks/workoutSessionReducer";
import { getExerciseInfo, computeWorkoutTotals } from "../../lib/exerciseStats";
import { getWorkoutTokens } from "../../lib/tokens";
import { ConfirmModal, Spinner } from "../../components/ui";
import { ExerciseCard, WorkoutHeader, WorkoutStatsBar, FloatingRestTimer, WorkoutSummaryScreen } from "../../components/workout";

export default function RoutineDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { routines: allRoutines, activeRoutine, startRoutine, endRoutine, saveCompletedWorkout, completedWorkouts, t, updateRoutine, theme } = useUser();
  const isDark = theme === "dark";
  const tk = getWorkoutTokens();
  const workoutId = id ? id.toString() : "";

  const foundRoutine = useMemo(() => {
    if (!id || !allRoutines) return null;
    return allRoutines.find((r) => r.id.toString() === id.toString()) || null;
  }, [id, allRoutines]);

  const { state, actions, elapsedSeconds, restRemainingSeconds, restActive, totals } = useWorkoutSession({
    workoutId,
    routine: foundRoutine,
    completedWorkouts,
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
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [showRoutineActiveAlert, setShowRoutineActiveAlert] = useState(false);
  const [finishName, setFinishName] = useState("");
  const [finishComments, setFinishComments] = useState("");
  const [finishTotalTime, setFinishTotalTime] = useState(0);
  const [updateOriginalRoutine, setUpdateOriginalRoutine] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [finishedWorkout, setFinishedWorkout] = useState(null);
  const [sessionPRNames, setSessionPRNames] = useState([]);

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
      if (map[ex.name]) return;
      const lastWorkout = (completedWorkouts || []).find((w) =>
        (w.exerciseDetails || w.details || []).some((ed) => (ed.name || ed.exercise) === ex.name)
      );
      const detail = lastWorkout && (lastWorkout.exerciseDetails || lastWorkout.details || []).find((ed) => (ed.name || ed.exercise) === ex.name);
      if (detail) map[ex.name] = detail.series;
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
    setShowFinishConfirm(false);
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
        const completedSeries = ex.series.filter((s) => s.completed).map((s) => ({ reps: s.reps, weight: s.weight, type: s.type }));
        if (completedSeries.length === 0) return null;
        return { name: ex.name, muscleGroup: ex.muscleGroup, series: completedSeries };
      })
      .filter(Boolean);

    const totalsCompleted = computeWorkoutTotals(
      exerciseDetails.map((ex) => ({ series: ex.series })),
      {}
    );
    const prNames = state.exercises.filter((ex) => ex.series.some((s) => s.completed && s.isPR)).map((ex) => ex.name);

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
    setSessionPRNames(prNames);
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
          prNames={sessionPRNames}
          onDone={() => router.push("/routines?tab=completed")}
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
          <h1 style={{ color: isDark ? "#fff" : "#333" }}>{foundRoutine?.name}</h1>
          <p style={{ color: isDark ? "#aaa" : "#666", marginBottom: "20px" }}>
            {previewExercises.length} {t("exercises_count")} · {previewExercises.reduce((sum, ex) => sum + ex.series.length, 0)} {t("total_series")}
          </p>

          <div style={{ backgroundColor: isDark ? "#1a1a1a" : "#fff", border: `1px solid ${isDark ? "#333" : "#eee"}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
            <h2 style={{ marginTop: 0, color: isDark ? "#fff" : "#333" }}>{t("workout_summary")}</h2>
            {previewExercises.map((exercise, idx) => {
              const info = getExerciseInfo(exercise.name);
              return (
                <div key={idx} style={{ backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9", padding: "12px", marginBottom: "10px", borderRadius: "6px", border: `1px solid ${isDark ? "#2a2a2a" : "#eee"}` }}>
                  <h3 style={{ margin: "0 0 8px 0", color: "#1dd1a1" }}>{t(exercise.name)}</h3>
                  <p style={{ margin: 0, color: isDark ? "#aaa" : "#666" }}>
                    {exercise.series.length} {t("series_label")} · {t("rest_between_series")} {exercise.rest}s
                  </p>
                  {exercise.series.map((serie, sIdx) => (
                    <div key={sIdx} style={{ fontSize: "0.9rem", color: isDark ? "#999" : "#888", marginLeft: "10px" }}>
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
            style={{ padding: "12px 30px", fontSize: "1.1rem", backgroundColor: "#1dd1a1", color: "#000", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
          >
            {t("start_routine")}
          </button>
        </div>

        {showRoutineActiveAlert && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000, padding: "20px" }}>
            <div style={{ backgroundColor: "#1a1a1a", borderRadius: "15px", padding: "30px", width: "320px", maxWidth: "100%", textAlign: "center", border: "2px solid #ff4d4d", boxSizing: "border-box" }}>
              <h3 style={{ color: "#fff", margin: "0 0 15px 0" }}>Ya tienes una rutina iniciada</h3>
              <p style={{ color: "#aaa", fontSize: "0.95rem", marginBottom: "25px", lineHeight: "1.4" }}>
                Debes terminar o cancelar la rutina de <strong>{activeRoutine?.name}</strong> antes de empezar una nueva.
              </p>
              <button onClick={() => setShowRoutineActiveAlert(false)} style={{ width: "100%", padding: "12px", backgroundColor: tk.accent, color: tk.onAccent, border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>
                Entendido
              </button>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  if (showFinishConfirm) {
    return (
      <Layout hideBottomNav>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
          <div style={{ backgroundColor: isDark ? "#1a1a1a" : "#fff", border: "2px solid #1dd1a1", borderRadius: "12px", padding: "40px", maxWidth: "500px", textAlign: "center" }}>
            <h2 style={{ color: isDark ? "#1dd1a1" : "#333", marginBottom: "20px", fontSize: "1.5rem" }}>{t("confirm_finish_title")}</h2>
            <p style={{ color: isDark ? "#ccc" : "#666", marginBottom: "30px" }}>{t("confirm_finish_subtitle")}</p>
            <div style={{ display: "flex", gap: "15px" }}>
              <button onClick={() => setShowFinishConfirm(false)} style={{ flex: 1, padding: "12px", backgroundColor: isDark ? "#444" : "#ddd", color: isDark ? "#fff" : "#333", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
                {t("no_continue")}
              </button>
              <button onClick={openFinishForm} style={{ flex: 1, padding: "12px", backgroundColor: "#1dd1a1", color: "#000", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
                {t("yes_finish")}
              </button>
            </div>
          </div>
        </div>
        <FloatingRestTimer restActive={restActive} restRemainingSeconds={restRemainingSeconds} elapsedSeconds={elapsedSeconds} onAdjust={actions.adjustRest} onStop={actions.stopRest} />
      </Layout>
    );
  }

  if (showFinishForm) {
    const totalExercises = state.exercises.length;
    return (
      <Layout hideBottomNav>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ backgroundColor: isDark ? "#1a1a1a" : "#fff", border: `2px solid ${isDark ? "#1dd1a1" : "#eee"}`, borderRadius: "12px", padding: "40px" }}>
            <h2 style={{ color: isDark ? "#1dd1a1" : "#333", marginBottom: "30px", fontSize: "1.5rem", textAlign: "center" }}>{t("finish_workout")}</h2>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.9rem", marginBottom: "8px" }}>{t("workout_name")}</label>
              <input
                type="text"
                value={finishName}
                onChange={(e) => setFinishName(e.target.value)}
                placeholder={t("placeholder_workout_name")}
                style={{ width: "100%", padding: "12px", backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9", border: `1px solid ${isDark ? "#333" : "#ddd"}`, borderRadius: "6px", color: isDark ? "#fff" : "#333", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.9rem", marginBottom: "8px" }}>{t("comments")}</label>
              <textarea
                value={finishComments}
                onChange={(e) => setFinishComments(e.target.value)}
                placeholder={t("placeholder_comments")}
                style={{ width: "100%", padding: "12px", backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9", border: `1px solid ${isDark ? "#333" : "#ddd"}`, borderRadius: "6px", color: isDark ? "#fff" : "#333", minHeight: "80px", boxSizing: "border-box", resize: "vertical" }}
              />
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.9rem", marginBottom: "8px" }}>{t("total_time_min")}</label>
              <input
                type="number"
                value={finishTotalTime}
                onChange={(e) => setFinishTotalTime(e.target.value)}
                min="0"
                style={{ width: "100%", padding: "12px", backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9", border: `1px solid ${isDark ? "#333" : "#ddd"}`, borderRadius: "6px", color: isDark ? "#fff" : "#333", boxSizing: "border-box" }}
              />
              <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#1dd1a1" }}>
                {t("real_time")} {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
              </p>
            </div>

            {(routineChanges.exercises > 0 || routineChanges.series > 0) && (
              <div style={{ backgroundColor: isDark ? "rgba(46, 230, 197, 0.1)" : "#f0fff4", padding: "15px", borderRadius: "8px", marginBottom: "25px", border: `1px solid ${tk.accent}` }}>
                <p style={{ color: tk.accent, fontWeight: "bold", margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✨</span> ¡Has mejorado la rutina!
                </p>
                <p style={{ color: isDark ? "#ccc" : "#666", fontSize: "0.9rem", margin: "0 0 15px 0", lineHeight: "1.4" }}>
                  Has realizado cambios:
                  <strong>
                    {" "}
                    {routineChanges.exercises > 0 && `${routineChanges.exercises} ejercicios nuevos`}
                    {routineChanges.exercises > 0 && routineChanges.series > 0 && " y "}
                    {routineChanges.series > 0 && `${routineChanges.series} series adicionales`}
                  </strong>
                  .
                </p>
                <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", color: isDark ? "#fff" : "#333", backgroundColor: isDark ? "#121212" : "#fff", padding: "10px", borderRadius: "6px", border: `1px solid ${isDark ? "#333" : "#eee"}` }}>
                  <input type="checkbox" checked={updateOriginalRoutine} onChange={(e) => setUpdateOriginalRoutine(e.target.checked)} style={{ width: "20px", height: "20px", accentColor: tk.accent, cursor: "pointer" }} />
                  <span style={{ fontSize: "0.95rem" }}>Actualizar rutina original con estos cambios</span>
                </label>
              </div>
            )}

            <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f1f1f1", borderRadius: "8px", padding: "20px", marginBottom: "25px" }}>
              <h3 style={{ color: isDark ? "#1dd1a1" : "#333", marginBottom: "15px", fontSize: "1.1rem" }}>{t("workout_summary")}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                {[
                  { label: t("exercises_count"), value: totalExercises },
                  { label: t("series_label"), value: totals.totalSeries },
                  { label: t("reps_label"), value: totals.totalReps },
                  { label: t("total_volume"), value: `${totals.totalVolume.toFixed(1)}kg` },
                ].map((stat) => (
                  <div key={stat.label} style={{ textAlign: "center" }}>
                    <div style={{ color: "#1dd1a1", fontSize: "1.8rem", fontWeight: "700" }}>{stat.value}</div>
                    <div style={{ color: isDark ? "#aaa" : "#666", fontSize: "0.9rem" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <button onClick={() => setShowFinishForm(false)} disabled={savingWorkout} style={{ flex: 1, padding: "12px", backgroundColor: isDark ? "#444" : "#ccc", color: isDark ? "#fff" : "#333", border: "none", borderRadius: "8px", cursor: savingWorkout ? "not-allowed" : "pointer", fontWeight: "600", opacity: savingWorkout ? 0.6 : 1 }}>
                {t("cancel")}
              </button>
              <button onClick={handleSaveFinishedRoutine} disabled={savingWorkout} style={{ flex: 1, padding: "12px", backgroundColor: savingWorkout ? "#16a853" : "#1dd1a1", color: savingWorkout ? "#fff" : "#000", border: "none", borderRadius: "8px", cursor: savingWorkout ? "not-allowed" : "pointer", fontWeight: "600" }}>
                {savingWorkout ? t("saving") : t("save_workout")}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ongoing
  return (
    <Layout hideBottomNav>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <WorkoutHeader mode="live" title={state.name || foundRoutine?.name} onBack={() => setShowDiscardConfirm(true)} primaryLabel="Terminar" onPrimaryAction={() => setShowFinishConfirm(true)} />

        <WorkoutStatsBar mode="live" elapsedSeconds={elapsedSeconds} totalVolume={totals.totalVolume} totalSeries={totals.totalSeries} />

        <div style={{ padding: "20px 15px" }}>
          {state.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.uid}
              exercise={exercise}
              mode="live"
              previousSeries={previousByName[exercise.name]}
              onUpdateField={(serieUid, field, value) => actions.updateSeriesField(exercise.uid, serieUid, field, value)}
              onToggleComplete={(serieUid) => actions.toggleSeriesComplete(exercise.uid, serieUid)}
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
          ))}

          <button
            onClick={() => setShowExerciseSelector(true)}
            style={{ width: "100%", padding: "15px", backgroundColor: tk.accentSoft, color: tk.accent, border: `1px dashed ${tk.accent}`, borderRadius: "10px", fontWeight: "600", cursor: "pointer" }}
          >
            + Agregar Ejercicio
          </button>
        </div>
      </div>

      <FloatingRestTimer restActive={restActive} restRemainingSeconds={restRemainingSeconds} elapsedSeconds={elapsedSeconds} onAdjust={actions.adjustRest} onStop={actions.stopRest} />

      <ConfirmModal
        isDark
        open={showDiscardConfirm}
        title="¿Cancelar entrenamiento?"
        description="Se perderán todos los datos registrados en esta sesión."
        confirmLabel="Sí, cancelar"
        cancelLabel="No, continuar"
        danger
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </Layout>
  );
}
