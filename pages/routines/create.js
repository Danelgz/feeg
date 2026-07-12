import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import ExerciseSelector from "../../components/ExerciseSelector";
import { useRoutineEditor } from "../../hooks/useRoutineEditor";
import { createExerciseFromCatalog } from "../../hooks/workoutSessionReducer";
import { getExerciseInfo, computeWorkoutTotals } from "../../lib/exerciseStats";
import { getWorkoutTokens } from "../../lib/tokens";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { ExerciseCard, WorkoutHeader, WorkoutStatsBar } from "../../components/workout";

export default function CreateRoutine() {
  const router = useRouter();
  const { id, editWorkout } = router.query;
  const { t, language, routines, completedWorkouts, saveRoutine: contextSaveRoutine, updateRoutine: contextUpdateRoutine, updateCompletedWorkout, showNotification } = useUser();
  const tk = getWorkoutTokens();

  const isEditMode = !!id;
  const isWorkoutEditMode = !!editWorkout;

  // Fuente de datos a editar: una rutina guardada, un entrenamiento ya completado, o ninguna
  // (creación desde cero). Los entrenamientos completados usan 'details' en vez de 'exercises'.
  const sourceRoutine = useMemo(() => {
    if (editWorkout && completedWorkouts?.length > 0) {
      const w = completedWorkouts.find((w) => w.id.toString() === editWorkout.toString());
      if (!w) return null;
      return { name: w.name, exercises: w.details || w.exercises || [] };
    }
    if (id && routines?.length > 0) {
      return routines.find((r) => r.id.toString() === id.toString()) || null;
    }
    return null;
  }, [id, editWorkout, routines, completedWorkouts]);

  const editorId = isWorkoutEditMode ? `workout-${editWorkout}` : isEditMode ? `routine-${id}` : "new-routine";

  const { state, actions } = useRoutineEditor({ editorId, routine: sourceRoutine });

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [substitutingUid, setSubstitutingUid] = useState(null);

  const totals = useMemo(() => computeWorkoutTotals(state.exercises, {}), [state.exercises]);

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

  const buildRoutinePayload = () => ({
    name: state.name,
    exercises: state.exercises.map((ex) => ({
      name: ex.name,
      group: ex.muscleGroup,
      type: ex.exerciseType,
      unit: ex.unit,
      rest: ex.restSeconds,
      series: ex.series.map((s) => ({ reps: s.reps, weight: s.weight, type: s.type })),
    })),
  });

  const handleSave = async () => {
    if (!state.name || state.exercises.length === 0) {
      showNotification(t("alert_fill_fields"), "error");
      return;
    }

    if (isWorkoutEditMode) {
      const original = completedWorkouts.find((w) => w.id.toString() === editWorkout.toString());
      const payload = buildRoutinePayload();
      const updatedWorkout = {
        ...original,
        name: payload.name,
        details: payload.exercises,
        totalVolume: totals.totalVolume,
        totalReps: totals.totalReps,
        series: totals.totalSeries,
        exercises: payload.exercises.length,
      };
      await updateCompletedWorkout(updatedWorkout);
      router.push("/profile");
    } else if (isEditMode) {
      await contextUpdateRoutine({ id: Number(id), ...buildRoutinePayload() });
      router.push("/routines");
    } else {
      await contextSaveRoutine({ id: Date.now(), ...buildRoutinePayload() });
      router.push("/routines");
    }
  };

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

  return (
    <Layout>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <WorkoutHeader
          mode="template"
          name={state.name}
          onNameChange={actions.setName}
          namePlaceholder={t("routine_name_placeholder")}
          primaryLabel={isEditMode ? t("save_routine_btn") : t("save_workout")}
          onPrimaryAction={handleSave}
        />

        <WorkoutStatsBar mode="template" totalVolume={totals.totalVolume} totalSeries={totals.totalSeries} exerciseCount={state.exercises.length} t={t} />

        <div style={{ padding: "20px 15px" }}>
          {state.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.uid}
              exercise={exercise}
              mode="template"
              translate={t}
              translateExerciseName={(name) => translateExerciseName(name, language)}
              onUpdateField={(serieUid, field, value) => actions.updateSeriesField(exercise.uid, serieUid, field, value)}
              onSetSeriesType={(serieUid, type) => actions.setSeriesType(exercise.uid, serieUid, type)}
              onAddSeries={() => actions.addSeries(exercise.uid)}
              onRemoveSeries={(serieUid) => actions.removeSeries(exercise.uid, serieUid)}
              onSetRest={(seconds) => actions.setExerciseRest(exercise.uid, seconds)}
              onSubstitute={() => {
                setSubstitutingUid(exercise.uid);
                setShowExerciseSelector(true);
              }}
              onDeleteExercise={() => actions.removeExercise(exercise.uid)}
            />
          ))}

          <button
            onClick={() => setShowExerciseSelector(true)}
            style={{ width: "100%", padding: "15px", backgroundColor: tk.accentSoft, color: tk.accent, border: `1px dashed ${tk.accent}`, borderRadius: "10px", fontWeight: "600", cursor: "pointer" }}
          >
            + {t("add_exercise")}
          </button>
        </div>
      </div>
    </Layout>
  );
}
