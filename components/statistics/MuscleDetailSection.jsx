import { computeExerciseIndex, computeSeriesByGroup } from "../../lib/exerciseStats";
import { bucketWorkouts } from "../../lib/statsSeries";
import ExerciseThumb from "../workout/ExerciseThumb";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { getTokens } from "../../lib/tokens";
import { useRanks } from "../../hooks/useRanks";
import { EmptyState, ExerciseRankList, Icon, MuscleGroupIcon } from "../ui";

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

  // Series de este grupo en cada una de las últimas 8 semanas: ¿lo estoy entrenando de forma
  // constante o sólo esta semana? Se reparte el historial por semanas y se cuenta por grupo.
  const weekly = bucketWorkouts(workouts || [], 'week', 8).map((b) => {
    const end = new Date(b.start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inWeek = (workouts || []).filter((w) => {
      const d = new Date(w.completedAt);
      return d >= b.start && d < end;
    });
    return { key: b.key, current: b.current, series: computeSeriesByGroup(inWeek, [group])[group] || 0 };
  });
  const maxWeekly = Math.max(1, ...weekly.map((w) => w.series));
  const line = tk.hairline;

  return (
    <div>
      <button
        onClick={onBack}
        className="feeg-press"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          color: tk.accent,
          fontSize: tk.fontSize.sm,
          fontWeight: 700,
          cursor: 'pointer',
          padding: 0,
          marginBottom: tk.space.md,
        }}
      >
        <Icon name="chevronLeft" size={16} />
        Volver al mapa
      </button>

      {/* Cabecera: el músculo, su trabajo de la semana y su constancia en 8 semanas */}
      <div style={{ padding: '4px 0 18px', marginBottom: 18, borderBottom: `1px solid ${line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 64, height: 64, borderRadius: 18, overflow: 'hidden', background: tk.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MuscleGroupIcon group={group} isDark={isDark} size={58} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: tk.text, letterSpacing: '-0.02em' }}>{label}</h2>
            <div style={{ fontSize: '0.8rem', color: tk.textMuted, marginTop: 2 }}>
              <b style={{ color: tk.text }}>{totalSeries}</b> series · <b style={{ color: tk.text }}>{Math.round(totalVolume).toLocaleString('es-ES')}</b> kg · últimos 7 días
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: tk.textMuted, fontWeight: 600, marginBottom: 6 }}>
            <span>Series por semana</span>
            <span>8 semanas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 44 }} role="img" aria-label={`Series de ${label} por semana: ${weekly.map((w) => w.series).join(', ')}`}>
            {weekly.map((w) => (
              <div key={w.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                <div
                  title={`${w.series} series`}
                  style={{
                    height: `${Math.max(w.series ? 8 : 3, (w.series / maxWeekly) * 100)}%`,
                    borderRadius: '4px 4px 1px 1px',
                    background: w.series ? tk.accent : line,
                    opacity: w.current ? 1 : w.series ? 0.4 : 1,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {available && groupRanks.length > 0 && (
        <div style={{ marginBottom: 18, paddingBottom: 6, borderBottom: `1px solid ${line}` }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: tk.text }}>
            Rangos <span style={{ fontSize: '0.74rem', fontWeight: 600, color: tk.textMuted }}>· histórico completo</span>
          </h3>
          <ExerciseRankList
            layout="grid"
            ranks={groupRanks}
            bodyweightKg={bodyweightKg}
            sex={sex}
            isDark={isDark}
            translateExercise={(name) => translateExerciseName(name, language)}
          />
        </div>
      )}

      <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 800, color: tk.text }}>
        Ejercicios <span style={{ fontSize: '0.74rem', fontWeight: 600, color: tk.textMuted }}>· últimos 7 días</span>
      </h3>
      {results.length === 0 ? (
        <EmptyState
          isDark={isDark}
          icon="dumbbell"
          title={`Esta semana no has entrenado ${label.toLowerCase()}`}
          description="El volumen de los últimos 7 días aparecerá aquí en cuanto lo trabajes."
        />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}` }}>
          {results.map((entry, idx) => {
            const share = totalSeries ? entry.series / totalSeries : 0;
            return (
              <li key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: idx ? `1px solid ${line}` : 'none' }}>
                <ExerciseThumb name={entry.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: tk.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {translateExerciseName(entry.name, language)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: tk.textMuted, marginTop: 2 }}>
                    {entry.series} series · {entry.reps} reps
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: line, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${share * 100}%`, height: '100%', background: tk.accent, borderRadius: 99 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 60 }}>
                  {entry.volume > 0 ? (
                    <>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: tk.text }}>{Math.round(entry.volume).toLocaleString('es-ES')}</div>
                      <div style={{ fontSize: '0.64rem', color: tk.textFaint }}>kg</div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.7rem', color: tk.textFaint }}>peso corp.</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
