import { useState } from "react";
import MiniStat from "./MiniStat";

export default function ExerciseStatsSection({ isDark, workouts, t }) {
  const [q, setQ] = useState('');
  const index = {};
  workouts.forEach(w => {
    if (Array.isArray(w.details)) {
      w.details.forEach(d => {
        const name = d.name || d.exercise || '';
        if (!name) return;
        if (!index[name]) index[name] = { sessions: 0, series: 0, reps: 0, volume: 0 };
        index[name].sessions += 1;
        index[name].series += Number(d.series || 0);
        index[name].reps += Number(d.reps || 0);
        index[name].volume += Number(d.weight || 0) * Number(d.reps || 0) * Number(d.series || 1);
      });
    }
  });
  const results = Object.entries(index)
    .filter(([name]) => name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b[1].sessions - a[1].sessions);

  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '16px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>Estadísticas por Ejercicio</h2>
        <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{results.length} ejercicios</span>
      </div>
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar ejercicio..."
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 12,
            border: `1px solid ${isDark ? '#333' : '#ddd'}`,
            background: isDark ? '#0f0f0f' : '#fafafa',
            color: isDark ? '#fff' : '#333',
            outline: 'none',
            fontSize: '1rem',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = '#1dd1a1'}
          onBlur={(e) => e.target.style.borderColor = isDark ? '#333' : '#ddd'}
        />
      </div>
      {results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
          <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>{q ? t('no_exercises_found') : 'No hay datos de ejercicios'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {results.map(([name, v], index) => (
            <div key={name} style={{
              background: isDark ? '#0f0f0f' : '#f9f9f9',
              border: isDark ? '1px solid #2a2a2a' : '1px solid #eee',
              borderRadius: 12,
              padding: 16,
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#1dd1a1';
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = isDark ? '#2a2a2a' : '#eee';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ color: isDark ? '#fff' : '#333', fontSize: '1rem' }}>{name}</strong>
                <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>#{index + 1}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <MiniStat label="Sesiones" value={v.sessions} isDark={isDark} />
                <MiniStat label="Series" value={v.series} isDark={isDark} />
                <MiniStat label="Reps" value={v.reps} isDark={isDark} />
                <MiniStat label="Volumen" value={v.volume.toLocaleString()} isDark={isDark} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
