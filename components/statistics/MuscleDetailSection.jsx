import { computeExerciseIndex } from "../../lib/exerciseStats";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import MiniStat from "./MiniStat";

/** Detalle de un músculo del mapa: qué ejercicios lo trabajaron y con qué volumen, en los
 * últimos 7 días (misma ventana que el mapa desde el que se llega aquí). */
export default function MuscleDetailSection({ isDark, group, workouts, t, language, onBack }) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekWorkouts = (workouts || []).filter(w => w.completedAt && new Date(w.completedAt) >= weekAgo);

  const index = computeExerciseIndex(weekWorkouts, (d) => d.muscleGroup === group);
  const results = Object.values(index).sort((a, b) => b.volume - a.volume);
  const totalSeries = results.reduce((sum, r) => sum + r.series, 0);
  const totalVolume = results.reduce((sum, r) => sum + r.volume, 0);

  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '16px',
      padding: '24px'
    }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: '#1dd1a1',
          fontSize: '0.85rem',
          fontWeight: '600',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '16px'
        }}
      >
        ← Volver al mapa
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>{t(group) || group}</h2>
        <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>Últimos 7 días</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: isDark ? '#0f0f0f' : '#f9f9f9', border: isDark ? '1px solid #2a2a2a' : '1px solid #eee', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: isDark ? '#666' : '#999', textTransform: 'uppercase' }}>Series totales</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>{totalSeries}</div>
        </div>
        <div style={{ background: isDark ? '#0f0f0f' : '#f9f9f9', border: isDark ? '1px solid #2a2a2a' : '1px solid #eee', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: isDark ? '#666' : '#999', textTransform: 'uppercase' }}>Volumen total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>{Math.round(totalVolume).toLocaleString()} kg</div>
        </div>
      </div>

      {results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧍</div>
          <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>Esta semana no has entrenado {(t(group) || group).toLowerCase()}.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {results.map((entry, idx) => (
            <div key={entry.name} style={{
              background: isDark ? '#0f0f0f' : '#f9f9f9',
              border: isDark ? '1px solid #2a2a2a' : '1px solid #eee',
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ color: isDark ? '#fff' : '#333', fontSize: '1rem' }}>{translateExerciseName(entry.name, language)}</strong>
                <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>#{idx + 1}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <MiniStat label="Series" value={entry.series} isDark={isDark} />
                <MiniStat label="Reps" value={entry.reps} isDark={isDark} />
                <MiniStat label="Volumen" value={`${Math.round(entry.volume).toLocaleString()} kg`} isDark={isDark} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
