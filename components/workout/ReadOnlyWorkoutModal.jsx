import { useEffect } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
import { toReadOnlyWorkoutExercises } from "../../lib/readOnlyWorkout";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { ExerciseCard, WorkoutHeader, WorkoutStatsBar } from "./index";

const noop = () => {};

function elapsedSecondsFor(workout) {
  return workout.elapsedTime || (workout.totalTime || 0) * 60;
}

/** Full-screen completed workout viewer using the live workout layout without edit actions. */
export default function ReadOnlyWorkoutModal({ workout, language, translate, onClose }) {
  const tk = getWorkoutTokens();
  const exercises = workout ? toReadOnlyWorkoutExercises(workout) : [];
  const totalSeries = workout?.series || exercises.reduce((total, exercise) => total + exercise.series.length, 0);

  useEffect(() => {
    if (!workout) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehaviorX;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehaviorX = "none";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehaviorX = previousOverscroll;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, workout]);

  if (!workout) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={workout.name}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 6000,
        backgroundColor: tk.bg,
        overflowY: "auto",
        overflowX: "hidden",
        touchAction: "pan-y",
        overscrollBehaviorX: "none",
        animation: "feeg-readonly-workout-in 240ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`
        @keyframes feeg-readonly-workout-in {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ maxWidth: "900px", width: "100%", minHeight: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <WorkoutHeader
          mode="live"
          title={workout.name}
          onBack={onClose}
          primaryLabel={translate("close")}
          onPrimaryAction={onClose}
        />
        <WorkoutStatsBar
          mode="live"
          elapsedSeconds={elapsedSecondsFor(workout)}
          totalVolume={workout.totalVolume}
          totalSeries={totalSeries}
          t={translate}
        />

        <div style={{ padding: "20px 15px 100px" }}>
          {workout.comments && (
            <div
              style={{
                margin: "0 0 24px",
                padding: "12px 14px",
                borderLeft: `3px solid ${tk.accent}`,
                borderRadius: tk.radius.sm,
                backgroundColor: tk.surface,
                color: tk.textMuted,
                fontSize: "0.9rem",
                fontStyle: "italic",
              }}
            >
              “{workout.comments}”
            </div>
          )}

          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.uid}
              exercise={exercise}
              mode="live"
              readOnly
              translate={translate}
              translateExerciseName={(name) => translateExerciseName(name, language)}
              previousSeries={undefined}
              showRirPreference
              progressionMode="off"
              onUpdateField={noop}
              onRirChange={noop}
              onToggleComplete={noop}
              onSetSeriesType={noop}
              onAddSeries={noop}
              onRemoveSeries={noop}
              onSetRest={noop}
              onSetNotes={noop}
              onSubstitute={noop}
              onDeleteExercise={noop}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
