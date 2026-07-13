import MuscleMap from "../MuscleMap";
import { computeSeriesByGroup } from "../../lib/exerciseStats";
import { MUSCLE_GROUPS } from "../../data/muscleMapRegions";

export default function MuscleMapSection({ isDark, workouts, t, onSelectMuscle }) {
  // Siempre se calcula sobre los últimos 7 días, independientemente del filtro de periodo de la página.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekWorkouts = (workouts || []).filter(w => w.completedAt && new Date(w.completedAt) >= weekAgo);

  // Solo los grupos que el cuerpo esquemático puede dibujar (Cardio/Aductor/Abductor/Cuerpo
  // Completo no tienen región propia) — ver "Series por grupo" para el desglose completo.
  const muscleSeriesCount = computeSeriesByGroup(weekWorkouts, MUSCLE_GROUPS);

  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '16px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>Mapa Muscular Semanal</h2>
        <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>Últimos 7 días</span>
      </div>
      {weekWorkouts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧍</div>
          <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>{t('stats_no_data')}</p>
          <p style={{ color: isDark ? '#888' : '#999', fontSize: '0.85rem', marginTop: '8px' }}>Entrena esta semana para ver tu mapa muscular</p>
        </div>
      ) : (
        <>
          <MuscleMap
            seriesByMuscle={muscleSeriesCount}
            isDark={isDark}
            onMuscleClick={onSelectMuscle}
            labelForGroup={(group) => t(group) || group}
          />
          <p style={{ textAlign: 'center', color: isDark ? '#666' : '#999', fontSize: '0.8rem', marginTop: '12px' }}>
            Toca un músculo para ver qué ejercicios lo han trabajado esta semana.
          </p>
        </>
      )}
    </section>
  );
}
