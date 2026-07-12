import MuscleMap from "../MuscleMap";

const GROUP_MAP = {
  Pecho: ['Pecho', 'Chest'],
  Espalda: ['Espalda', 'Back'],
  Hombros: ['Hombros', 'Shoulders'],
  Bíceps: ['Bíceps', 'Biceps'],
  Tríceps: ['Tríceps', 'Triceps'],
  Cuádriceps: ['Cuádriceps', 'Quads'],
  Femoral: ['Femoral', 'Hamstrings'],
  Glúteos: ['Glúteos', 'Glutes'],
  Gemelos: ['Gemelos', 'Calves'],
  Abdomen: ['Abdomen', 'Abs', 'Core'],
  Antebrazo: ['Antebrazo', 'Antebrazos', 'Forearms'],
  Cuello: ['Cuello', 'Neck']
};

export default function MuscleMapSection({ isDark, workouts, t, router }) {
  // Siempre se calcula sobre los últimos 7 días, independientemente del filtro de periodo de la página.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekWorkouts = (workouts || []).filter(w => w.completedAt && new Date(w.completedAt) >= weekAgo);

  const muscleSeriesCount = {};
  Object.keys(GROUP_MAP).forEach(g => muscleSeriesCount[g] = 0);

  weekWorkouts.forEach(w => {
    if (Array.isArray(w.details)) {
      w.details.forEach(d => {
        const grp = d.muscleGroup || d.group || d.category;
        const found = Object.keys(GROUP_MAP).find(key => GROUP_MAP[key].includes(grp));
        if (found) muscleSeriesCount[found] += Number(d.series || 0);
      });
    }
    if (!Array.isArray(w.details) && w.seriesByGroup) {
      Object.entries(w.seriesByGroup).forEach(([k, v]) => {
        const found = Object.keys(GROUP_MAP).find(key => GROUP_MAP[key].includes(k) || key === k);
        if (found) muscleSeriesCount[found] += Number(v || 0);
      });
    }
  });

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
        <MuscleMap
          seriesByMuscle={muscleSeriesCount}
          isDark={isDark}
          onMuscleClick={(group) => router.push(`/statistics/${encodeURIComponent(group)}`)}
          labelForGroup={(group) => t(group) || group}
        />
      )}
    </section>
  );
}
