import MuscleMap from "../MuscleMap";
import StatSection from "./StatSection";
import { EmptyState } from "../ui";
import { getTokens } from "../../lib/tokens";
import { computeSeriesByGroup } from "../../lib/exerciseStats";
import { MUSCLE_GROUPS } from "../../data/muscleMapRegions";

export default function MuscleMapSection({ isDark, isMobile, workouts, t, sex, faceStyleId, onSelectMuscle }) {
  const tk = getTokens(isDark);
  // Siempre se calcula sobre los últimos 7 días, independientemente del filtro de periodo de la página.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekWorkouts = (workouts || []).filter(w => w.completedAt && new Date(w.completedAt) >= weekAgo);

  // Solo los grupos que el cuerpo esquemático puede dibujar (Cardio/Aductor/Abductor/Cuerpo
  // Completo no tienen región propia) — ver "Series por grupo" para el desglose completo.
  const muscleSeriesCount = computeSeriesByGroup(weekWorkouts, MUSCLE_GROUPS);

  return (
    <StatSection
      title="Mapa muscular semanal"
      meta="Últimos 7 días"
      isDark={isDark}
      isMobile={isMobile}
    >
      {weekWorkouts.length === 0 ? (
        <EmptyState
          isDark={isDark}
          icon="user"
          title={t("stats_no_data")}
          description="Entrena esta semana para ver qué grupos has trabajado y cuáles se te están quedando atrás."
        />
      ) : (
        <>
          <MuscleMap
            seriesByMuscle={muscleSeriesCount}
            isDark={isDark}
            sex={sex}
            faceStyleId={faceStyleId}
            onMuscleClick={onSelectMuscle}
            labelForGroup={(group) => t(group) || group}
          />
          <p
            style={{
              textAlign: "center",
              color: tk.textFaint,
              fontSize: tk.fontSize.xs,
              marginTop: tk.space.md,
              marginBottom: 0,
            }}
          >
            Toca un músculo para ver qué ejercicios lo han trabajado esta semana.
          </p>
        </>
      )}
    </StatSection>
  );
}
