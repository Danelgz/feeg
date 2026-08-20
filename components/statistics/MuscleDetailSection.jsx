import { computeExerciseIndex } from "../../lib/exerciseStats";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { getTokens } from "../../lib/tokens";
import { useRanks } from "../../hooks/useRanks";
import { EmptyState, ExerciseRankList, Icon } from "../ui";
import StatSection from "./StatSection";
import MiniStat from "./MiniStat";

/**
 * Detalle de un músculo del mapa: sus rangos por ejercicio y el trabajo de los últimos 7 días.
 *
 * Los rangos van primero y miran al HISTÓRICO COMPLETO, mientras que el volumen de debajo mira a los
 * últimos 7 días (la misma ventana que el mapa desde el que se llega). No es una incoherencia: un
 * rango que conseguiste hace dos meses sigue siendo tuyo, pero el volumen de hace dos meses no dice
 * nada de cómo estás entrenando ahora. Cada bloque lleva su periodo escrito para que se note.
 */
export default function MuscleDetailSection({ isDark, isMobile, group, workouts, t, language, onBack }) {
  const tk = getTokens(isDark);
  const { available, exerciseRanks, bodyweightKg, sex } = useRanks();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekWorkouts = (workouts || []).filter(w => w.completedAt && new Date(w.completedAt) >= weekAgo);

  const index = computeExerciseIndex(weekWorkouts, (d) => (d.muscleGroup || d.group) === group);
  const results = Object.values(index).sort((a, b) => b.volume - a.volume);
  const totalSeries = results.reduce((sum, r) => sum + r.series, 0);
  const totalVolume = results.reduce((sum, r) => sum + r.volume, 0);

  const groupRanks = exerciseRanks.filter((r) => r.group === group);
  const label = t(group) || group;

  return (
    <StatSection title={label} meta="Últimos 7 días" isDark={isDark} isMobile={isMobile}>
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tk.space.xs,
          background: 'none',
          border: 'none',
          color: tk.accent,
          fontSize: tk.fontSize.sm,
          fontWeight: tk.weight.medium,
          cursor: 'pointer',
          padding: 0,
          marginBottom: tk.space.lg,
        }}
      >
        <Icon name="chevronLeft" size={16} />
        Volver al mapa
      </button>

      {available && groupRanks.length > 0 && (
        <div style={{ marginBottom: tk.space.xxl }}>
          <div
            style={{
              color: tk.textMuted,
              fontSize: tk.fontSize.xs,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: tk.weight.medium,
              marginBottom: tk.space.md,
            }}
          >
            Rangos · histórico completo
          </div>
          <ExerciseRankList
            ranks={groupRanks}
            bodyweightKg={bodyweightKg}
            sex={sex}
            isDark={isDark}
            translateExercise={(name) => translateExerciseName(name, language)}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: tk.space.lg, marginBottom: tk.space.xxl }}>
        <div
          className="feeg-surface"
          style={{
            borderRadius: tk.radius.md,
            padding: tk.space.lg,
            textAlign: 'center',
            '--feeg-bg': tk.surfaceAlt,
            '--feeg-border': tk.border,
          }}
        >
          <div style={{ fontSize: tk.fontSize.xs, color: tk.textFaint, textTransform: 'uppercase' }}>Series totales</div>
          <div style={{ fontSize: tk.fontSize.xl, fontWeight: tk.weight.bold, color: tk.text, fontVariantNumeric: 'tabular-nums' }}>
            {totalSeries}
          </div>
        </div>
        <div
          className="feeg-surface"
          style={{
            borderRadius: tk.radius.md,
            padding: tk.space.lg,
            textAlign: 'center',
            '--feeg-bg': tk.surfaceAlt,
            '--feeg-border': tk.border,
          }}
        >
          <div style={{ fontSize: tk.fontSize.xs, color: tk.textFaint, textTransform: 'uppercase' }}>Volumen total</div>
          <div style={{ fontSize: tk.fontSize.xl, fontWeight: tk.weight.bold, color: tk.text, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(totalVolume).toLocaleString('es-ES')} kg
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          isDark={isDark}
          icon="dumbbell"
          title={`Esta semana no has entrenado ${label.toLowerCase()}`}
          description="El volumen de los últimos 7 días aparecerá aquí en cuanto lo trabajes."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: tk.space.md }}>
          {results.map((entry, idx) => (
            <div
              key={entry.name}
              className="feeg-surface"
              style={{
                borderRadius: tk.radius.md,
                padding: tk.space.lg,
                '--feeg-bg': tk.surfaceAlt,
                '--feeg-border': tk.border,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: tk.space.md, marginBottom: tk.space.md }}>
                <strong
                  style={{
                    color: tk.text,
                    fontSize: tk.fontSize.md,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {translateExerciseName(entry.name, language)}
                </strong>
                <span style={{ fontSize: tk.fontSize.sm, color: tk.accent, fontWeight: tk.weight.medium, flexShrink: 0 }}>
                  #{idx + 1}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: tk.space.md }}>
                <MiniStat label="Series" value={entry.series} isDark={isDark} />
                <MiniStat label="Reps" value={entry.reps} isDark={isDark} />
                <MiniStat label="Volumen" value={`${Math.round(entry.volume).toLocaleString('es-ES')} kg`} isDark={isDark} />
              </div>
            </div>
          ))}
        </div>
      )}
    </StatSection>
  );
}
