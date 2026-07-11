import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import ExerciseSelector from "../../components/ExerciseSelector";
import { useWorkoutSession } from "../../hooks/useWorkoutSession";
import { createExerciseFromCatalog } from "../../hooks/workoutSessionReducer";
import { getExerciseInfo, computeWorkoutTotals } from "../../lib/exerciseStats";
import { getWorkoutTokens } from "../../lib/tokens";
import { ConfirmModal } from "../../components/ui";
import { ExerciseCard, WorkoutHeader, WorkoutStatsBar, FloatingRestTimer, WorkoutSummaryScreen } from "../../components/workout";

const WORKOUT_ID = "empty";

export default function EmptyRoutine() {
  const router = useRouter();
  const { activeRoutine, startRoutine, endRoutine, saveCompletedWorkout, completedWorkouts, t } = useUser();
  const tk = getWorkoutTokens();

  const { state, actions, elapsedSeconds, restRemainingSeconds, restActive, totals } = useWorkoutSession({
    workoutId: WORKOUT_ID,
    routine: null,
    completedWorkouts,
  });

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [substitutingUid, setSubstitutingUid] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [showRoutineActiveAlert, setShowRoutineActiveAlert] = useState(false);
  const [finishName, setFinishName] = useState("Entrenamiento Vacío");
  const [finishComments, setFinishComments] = useState("");
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [finishedWorkout, setFinishedWorkout] = useState(null);
  const [sessionPRNames, setSessionPRNames] = useState([]);

  // Red de seguridad: si el contexto global dice que hay una rutina activa "empty" pero el
  // snapshot local no se restauró (p.ej. localStorage vacío en este navegador), sincroniza.
  useEffect(() => {
    if (activeRoutine?.id === WORKOUT_ID && state.status === "preview") {
      actions.start();
    }
  }, [activeRoutine]);

  const handleStart = () => {
    if (activeRoutine && activeRoutine.id !== WORKOUT_ID) {
      setShowRoutineActiveAlert(true);
      return;
    }
    actions.start();
    startRoutine({ id: WORKOUT_ID, name: "Entrenamiento Vacío", path: "/routines/empty" });
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

  const handleSaveFinishedRoutine = () => {
    setSavingWorkout(true);

    const totals = computeWorkoutTotals(state.exercises, { onlyCompleted: true });
    const prNames = state.exercises.filter((ex) => ex.series.some((s) => s.completed && s.isPR)).map((ex) => ex.name);

    const completedWorkout = {
      id: Date.now(),
      name: finishName,
      comments: finishComments,
      completedAt: new Date().toISOString(),
      elapsedTime: elapsedSeconds,
      totalTime: Math.floor(elapsedSeconds / 60),
      exercises: state.exercises.length,
      series: totals.totalSeries,
      totalReps: totals.totalReps,
      totalVolume: totals.totalVolume,
      exerciseDetails: state.exercises.map((ex) => ({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        series: ex.series.map((s) => ({ reps: s.reps, weight: s.weight, type: s.type })),
      })),
    };

    saveCompletedWorkout(completedWorkout);
    actions.discard();
    endRoutine();
    actions.finish();
    setFinishedWorkout(completedWorkout);
    setSessionPRNames(prNames);
    setSavingWorkout(false);
  };

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
    return (
      <Layout>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center", padding: "20px 0" }}>
          <h1 style={{ color: tk.text }}>Entrenamiento Vacío</h1>
          <p style={{ color: tk.textMuted, marginBottom: "30px" }}>
            Empieza un entrenamiento desde cero agregando ejercicios sobre la marcha.
          </p>
          <button
            onClick={handleStart}
            style={{
              backgroundColor: tk.accent,
              color: tk.onAccent,
              border: "none",
              borderRadius: tk.radius.md,
              padding: "15px 40px",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Empezar Entrenamiento
          </button>
        </div>

        {showRoutineActiveAlert && (
          <div
            onClick={() => setShowRoutineActiveAlert(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 3000,
              padding: "20px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: tk.surface,
                borderRadius: tk.radius.lg,
                padding: "30px",
                width: "320px",
                maxWidth: "100%",
                textAlign: "center",
                border: `2px solid ${tk.danger}`,
                boxSizing: "border-box",
              }}
            >
              <h3 style={{ color: tk.text, margin: "0 0 15px 0" }}>Ya tienes una rutina iniciada</h3>
              <p style={{ color: tk.textMuted, fontSize: "0.95rem", marginBottom: "25px" }}>
                Debes terminar o cancelar la rutina de <strong>{activeRoutine?.name}</strong> antes de empezar una nueva.
              </p>
              <button
                onClick={() => setShowRoutineActiveAlert(false)}
                style={{ width: "100%", padding: "12px", backgroundColor: tk.accent, color: tk.onAccent, border: "none", borderRadius: tk.radius.md, fontWeight: "bold", cursor: "pointer" }}
              >
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
          <div style={{ backgroundColor: tk.surface, border: `2px solid ${tk.accent}`, borderRadius: tk.radius.lg, padding: "40px", textAlign: "center", maxWidth: "400px" }}>
            <h2 style={{ color: tk.accent, marginBottom: "20px" }}>¿Terminar entreno?</h2>
            <div style={{ display: "flex", gap: "15px" }}>
              <button onClick={() => setShowFinishConfirm(false)} style={{ flex: 1, padding: "12px", background: tk.surfaceAlt, color: tk.text, border: "none", borderRadius: tk.radius.sm, cursor: "pointer" }}>
                No
              </button>
              <button
                onClick={() => {
                  setShowFinishConfirm(false);
                  setShowFinishForm(true);
                }}
                style={{ flex: 1, padding: "12px", background: tk.accent, color: tk.onAccent, border: "none", borderRadius: tk.radius.sm, fontWeight: "bold", cursor: "pointer" }}
              >
                Sí, terminar
              </button>
            </div>
          </div>
        </div>
        <FloatingRestTimer restActive={restActive} restRemainingSeconds={restRemainingSeconds} elapsedSeconds={elapsedSeconds} onAdjust={actions.adjustRest} onStop={actions.stopRest} />
      </Layout>
    );
  }

  if (showFinishForm) {
    return (
      <Layout hideBottomNav>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ backgroundColor: tk.surface, border: `1px solid ${tk.accent}`, borderRadius: tk.radius.lg, padding: "30px" }}>
            <h2 style={{ color: tk.accent, textAlign: "center", marginBottom: "30px" }}>Finalizar Entrenamiento</h2>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: tk.textMuted, fontSize: "0.9rem", display: "block", marginBottom: "8px" }}>Nombre del entreno</label>
              <input
                type="text"
                value={finishName}
                onChange={(e) => setFinishName(e.target.value)}
                style={{ width: "100%", padding: "12px", background: tk.bg, border: `1px solid ${tk.border}`, borderRadius: tk.radius.sm, color: tk.text, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: tk.textMuted, fontSize: "0.9rem", display: "block", marginBottom: "8px" }}>Comentarios</label>
              <textarea
                value={finishComments}
                onChange={(e) => setFinishComments(e.target.value)}
                style={{ width: "100%", padding: "12px", background: tk.bg, border: `1px solid ${tk.border}`, borderRadius: tk.radius.sm, color: tk.text, minHeight: "80px", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", gap: "15px", marginTop: "30px" }}>
              <button onClick={() => setShowFinishForm(false)} style={{ flex: 1, padding: "12px", background: tk.surfaceAlt, color: tk.text, border: "none", borderRadius: tk.radius.sm, cursor: "pointer" }}>
                Cancelar
              </button>
              <button
                onClick={handleSaveFinishedRoutine}
                disabled={savingWorkout}
                style={{ flex: 1, padding: "12px", background: tk.accent, color: tk.onAccent, border: "none", borderRadius: tk.radius.sm, fontWeight: "bold", cursor: savingWorkout ? "not-allowed" : "pointer", opacity: savingWorkout ? 0.7 : 1 }}
              >
                {savingWorkout ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideBottomNav>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <WorkoutHeader mode="live" title="Entreno Vacío" onBack={() => setShowDiscardConfirm(true)} primaryLabel="Terminar" onPrimaryAction={() => setShowFinishConfirm(true)} />

        <WorkoutStatsBar mode="live" elapsedSeconds={elapsedSeconds} totalVolume={totals.totalVolume} totalSeries={totals.totalSeries} />

        <div style={{ padding: "20px 15px" }}>
          {state.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.uid}
              exercise={exercise}
              mode="live"
              translate={t}
              previousSeries={undefined}
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
            style={{
              width: "100%",
              padding: "15px",
              backgroundColor: tk.accentSoft,
              color: tk.accent,
              border: `1px dashed ${tk.accent}`,
              borderRadius: tk.radius.md,
              fontWeight: "600",
              cursor: "pointer",
            }}
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
