import { useState } from "react";
import MiniStat from "./MiniStat";
import { computeExerciseIndex } from "../../lib/exerciseStats";
import { translateExerciseName } from "../../lib/exerciseTranslation";

export default function ExerciseStatsSection({ isDark, workouts, t, language }) {
  const [q, setQ] = useState('');
  const index = computeExerciseIndex(workouts);
  const results = Object.values(index)
    .filter((entry) => translateExerciseName(entry.name, language).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.sessions - a.sessions);

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
          <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>{q ? t('no_exercises_found') : 'Aún no hay ejercicios registrados en este periodo'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {results.map((entry, idx) => (
            <div key={entry.name} style={{
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
                <strong style={{ color: isDark ? '#fff' : '#333', fontSize: '1rem' }}>{translateExerciseName(entry.name, language)}</strong>
                <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>#{idx + 1}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <MiniStat label="Sesiones" value={entry.sessions} isDark={isDark} />
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
