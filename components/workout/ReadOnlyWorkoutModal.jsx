import { useEffect } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
import { toReadOnlyWorkoutExercises } from "../../lib/readOnlyWorkout";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { ExerciseCard, WorkoutHeader, WorkoutStatsBar, WorkoutExercisePager } from "./index";

const noop = () => {};

function elapsedSecondsFor(workout) {
  return workout.elapsedTime || (workout.totalTime || 0) * 60;
}

/**
 * Entreno terminado, visto EXACTAMENTE con el mismo armazón que un entreno en curso (mismo header,
 * misma barra de stats, mismo pager de un ejercicio a pantalla completa con sus segmentos de
 * progreso — ver la rama "ongoing" de pages/routines/[id].js) y no una lista plana con todos los
 * ejercicios apilados, que es como estaba antes. Lo único que cambia es lo que readOnly apaga en
 * ExerciseCard/SeriesRow: ticks, menú de acciones, recomendaciones de sobrecarga
 * (progressionMode="off") y la columna "ANTERIOR". El RIR si se ve, pero solo si esa serie
 * concreta lo tiene guardado (ExerciseCard calcula hasRecordedRir con readOnly=true) — nunca se
 * inventa uno si quien entrenó no lo registró.
 *
 * fontFamily: Manrope se declara aquí, no en ExerciseCard/WorkoutHeader/etc. — esos archivos son
 * compartidos con las pantallas de "modo entreno" en vivo (create/empty/[id]), que a propósito no
 * lo usan (ver el historial de commits de esta zona). Como es CSS heredado, envolver aquí el árbol
 * entero le da la tipografía "premium" al visor sin tocar ni un pixel de la experiencia en vivo.
 */
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
        fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
        fontWeight: 500,
      }}
    >
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap");
        @keyframes feeg-readonly-workout-in {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="feeg-active-workout-viewport"
        style={{
          maxWidth: "900px",
          width: "100%",
          height: "100dvh",
          minHeight: 0,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          touchAction: "pan-y",
          overscrollBehaviorX: "none",
          animation: "feeg-readonly-workout-in 240ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
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

        {workout.comments && (
          <div
            style={{
              margin: "0 15px 12px",
              padding: "12px 14px",
              borderLeft: `3px solid ${tk.accent}`,
              borderRadius: tk.radius.sm,
              backgroundColor: tk.surface,
              color: tk.textMuted,
              fontSize: "0.9rem",
              fontWeight: 600,
              fontStyle: "italic",
              flexShrink: 0,
            }}
          >
            “{workout.comments}”
          </div>
        )}

        <WorkoutExercisePager
          exercises={exercises}
          renderExercise={(exercise) => (
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
          )}
        />
      </div>
    </div>
  );
}
