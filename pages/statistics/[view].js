import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import { exercisesList } from "../../data/exercises";

export default function StatisticsView() {
  const router = useRouter();
  const { view } = router.query;
  const { t, theme, isMobile, completedWorkouts: contextWorkouts } = useUser();
  const isDark = theme === 'dark';
  const [isNarrow, setIsNarrow] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 7days, 30days, 90days, all

  const workouts = contextWorkouts || [];

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const groupMap = {
    Pecho: ['Pecho', 'Chest'],
    Espalda: ['Espalda', 'Back', 'Lats', 'Traps', 'Lower Back'],
    Hombros: ['Hombros', 'Shoulders', 'Deltoids'],
    Bíceps: ['Bíceps', 'Biceps'],
    Tríceps: ['Tríceps', 'Triceps'],
    Cuádriceps: ['Cuádriceps', 'Quads', 'Quadriceps'],
    Femoral: ['Femoral', 'Hamstrings'],
    Glúteos: ['Glúteos', 'Glutes'],
    Gemelos: ['Gemelos', 'Calves'],
    Abdomen: ['Abdomen', 'Abs', 'Core', 'Obliques']
  };

  const muscleIcons = {
    Pecho: '💪',
    Espalda: '🔙',
    Hombros: '🏋️',
    Bíceps: '💪',
    Tríceps: '💪',
    Cuádriceps: '🦵',
    Femoral: '🦵',
    Glúteos: '🍑',
    Gemelos: '🦵',
    Abdomen: '🎯'
  };

  const filteredWorkouts = useMemo(() => {
    if (!workouts) return [];
    const now = new Date();
    return workouts.filter(w => {
      if (!w.completedAt) return false;
      const workoutDate = new Date(w.completedAt);
      if (selectedPeriod === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return workoutDate >= sevenDaysAgo;
      } else if (selectedPeriod === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return workoutDate >= thirtyDaysAgo;
      } else if (selectedPeriod === '90days') {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return workoutDate >= ninetyDaysAgo;
      }
      return true;
    });
  }, [workouts, selectedPeriod]);

  const muscleStats = useMemo(() => {
    const counts = {};
    Object.keys(groupMap).forEach(g => counts[g] = 0);

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    filteredWorkouts.forEach(w => {
      if (!w.completedAt) return;
      const workoutDate = new Date(w.completedAt);
      if (workoutDate < sevenDaysAgo) return;

      const details = w.exerciseDetails || w.details;
      if (Array.isArray(details)) {
        details.forEach(d => {
          const grp = d.muscleGroup || d.group || d.category;
          let found = Object.keys(groupMap).find(key =>
            key === grp || groupMap[key].includes(grp)
          );

          // Fallback: search by exercise name in exercisesList if group is missing
          if (!found && d.name) {
            const exerciseName = d.name;
            for (const [groupKey, exercises] of Object.entries(exercisesList || {})) {
              if (exercises.some(ex => ex.name === exerciseName)) {
                found = groupKey;
                break;
              }
            }
          }

          if (found) {
            const seriesCount = Array.isArray(d.series) ? d.series.length : Number(d.series || 0);
            counts[found] += seriesCount;
          }
        });
      }
      if (!Array.isArray(details) && w.seriesByGroup) {
        Object.entries(w.seriesByGroup).forEach(([k, v]) => {
          const found = Object.keys(groupMap).find(key => groupMap[key].includes(k) || key === k);
          if (found) counts[found] += Number(v || 0);
        });
      }
    });

    const max = Math.max(1, ...Object.values(counts));

    const getIntensity = (val) => {
      if (val === 0) return 0;
      const ratio = val / max;
      if (ratio <= 0.25) return 1;
      if (ratio <= 0.5) return 2;
      if (ratio <= 0.75) return 3;
      return 4;
    };

    const getColor = (intensity) => {
      if (intensity === 0) return 'rgba(0, 0, 0, 0)';
      if (intensity === 1) return '#c4f5e7';
      if (intensity === 2) return '#8dedce';
      if (intensity === 3) return '#57e5b6';
      return '#1dd1a1';
    };

    return { counts, max, getIntensity, getColor };
  }, [filteredWorkouts, isDark]);

  const seriesByGroup = useMemo(() => {
    const counts = {};
    Object.keys(groupMap).forEach(g => counts[g] = 0);
    filteredWorkouts.forEach(w => {
      if (Array.isArray(w.details)) {
        w.details.forEach(d => {
          const grp = d.muscleGroup || d.group || d.category;
          const found = Object.keys(groupMap).find(key => groupMap[key].includes(grp));
          if (found) counts[found] += Number(d.series || 0);
        });
      }
      if (!Array.isArray(w.details) && w.seriesByGroup) {
        Object.entries(w.seriesByGroup).forEach(([k, v]) => {
          const found = Object.keys(groupMap).find(key => groupMap[key].includes(k) || key === k);
          if (found) counts[found] += Number(v || 0);
        });
      }
    });
    return counts;
  }, [filteredWorkouts]);

  const total = useMemo(() => Object.values(seriesByGroup).reduce((a, b) => a + b, 0) || 1, [seriesByGroup]);

  const nav = [
    { key: 'series', label: '💪 Series por grupo', icon: '💪', description: 'Distribución de series por músculo' },
    { key: 'distribution', label: '📈 Distribución', icon: '📈', description: 'Gráfico de distribución muscular' },
    { key: 'monthly', label: '📅 Mensual', icon: '📅', description: 'Informe detallado por mes' },
    { key: 'exercises', label: '🏋️ Ejercicios', icon: '🏋️', description: 'Estadísticas por ejercicio' }
  ];

  return (
    <Layout>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: isNarrow ? "1.8rem" : "2.5rem", marginBottom: "0.5rem", color: isDark ? "#fff" : "#333", fontWeight: "bold" }}>
          📊 {t('statistics')}
        </h1>
        <p style={{ color: isDark ? "#888" : "#666", fontSize: isNarrow ? "0.9rem" : "1rem", marginBottom: "1rem" }}>
          Analiza tu progreso y mejora tu entrenamiento con datos detallados
        </p>
      </div>

      {/* Period Filter */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: '7days', label: '7 días' },
          { key: '30days', label: '30 días' },
          { key: '90days', label: '90 días' },
          { key: 'all', label: 'Todo' }
        ].map(period => (
          <button
            key={period.key}
            onClick={() => setSelectedPeriod(period.key)}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedPeriod === period.key ? '#1dd1a1' : (isDark ? '#1a1a1a' : '#fff'),
              border: `1px solid ${selectedPeriod === period.key ? '#1dd1a1' : (isDark ? '#333' : '#ddd')}`,
              borderRadius: '20px',
              color: selectedPeriod === period.key ? '#000' : (isDark ? '#fff' : '#333'),
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isNarrow ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {nav.map(item => (
          <Link key={item.key} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '16px',
              backgroundColor: view === item.key ? 'rgba(29, 209, 161, 0.1)' : (isDark ? '#1a1a1a' : '#fff'),
              border: `2px solid ${view === item.key ? '#1dd1a1' : (isDark ? '#333' : '#ddd')}`,
              borderRadius: '16px',
              color: isDark ? '#fff' : '#333',
              textAlign: 'left',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              if (view !== item.key) {
                e.currentTarget.style.borderColor = '#1dd1a1';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseOut={(e) => {
              if (view !== item.key) {
                e.currentTarget.style.borderColor = isDark ? '#333' : '#ddd';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{item.icon}</div>
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '4px' }}>{item.label}</div>
            <div style={{ fontSize: '0.75rem', color: isDark ? '#888' : '#666' }}>{item.description}</div>
          </div>
        </Link>
        ))}
      </div>

      {view === 'series' && (
        <Section title="💪 Series por Grupo Muscular" isDark={isDark} isNarrow={isNarrow}>
          {Object.entries(seriesByGroup).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💪</div>
              <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>{t('stats_no_data')}</p>
            </div>
          ) : (
            <div>
              {Object.entries(seriesByGroup).sort((a, b) => b[1] - a[1]).map(([g, n], i, arr) => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ 
                    width: '45px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '1.3rem'
                  }}>
                    {muscleIcons?.[g] || '💪'}
                  </div>
                  <div style={{ width: '120px', color: isDark ? '#ddd' : '#444', fontSize: '0.9rem', fontWeight: '500' }}>{t(g) || g}</div>
                  <div style={{ flex: 1, height: '20px', background: isDark ? '#0f0f0f' : '#eee', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${n === 0 ? 2 : Math.min(100, (n / Math.max(1, arr[0][1])) * 100)}%`, 
                      height: '100%', 
                      background: n > 0 ? 'linear-gradient(90deg, #1dd1a1, #19b088)' : (isDark ? '#333' : '#ddd'),
                      borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ width: '50px', textAlign: 'right', color: isDark ? '#fff' : '#333', fontWeight: 'bold', fontSize: '0.95rem' }}>{n}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {view === 'distribution' && (
        <Section title="📈 Distribución Muscular" isDark={isDark} isNarrow={isNarrow}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {Object.entries(seriesByGroup).map(([g, n]) => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '45px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.3rem'
                }}>
                  {muscleIcons?.[g] || '💪'}
                </div>
                <div style={{ width: '120px', color: isDark ? '#ddd' : '#444', fontSize: '0.9rem', fontWeight: '500' }}>{t(g) || g}</div>
                <div style={{ flex: 1, height: '20px', background: isDark ? '#0f0f0f' : '#eee', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${(n / total) * 100}%`, 
                    height: '100%', 
                    background: n > 0 ? 'linear-gradient(90deg, #1dd1a1, #19b088)' : (isDark ? '#333' : '#ddd'),
                    borderRadius: '999px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <div style={{ width: '60px', textAlign: 'right', color: isDark ? '#fff' : '#333', fontWeight: 'bold', fontSize: '0.95rem' }}>{Math.round((n / total) * 100)}%</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {view === 'monthly' && (
        <Monthly isDark={isDark} workouts={workouts} t={t} isMobile={isNarrow} />
      )}

      {view === 'exercises' && (
        <ExerciseStats isDark={isDark} workouts={workouts} t={t} isMobile={isNarrow} />
      )}

      {!view && (
        <p style={{ color: isDark ? '#aaa' : '#666' }}>{t('stats_no_data')}</p>
      )}
    </Layout>
  );
}

function Section({ title, isDark, children, isNarrow }) {
  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '16px',
      padding: isNarrow ? '16px' : '24px'
    }}>
      <h2 style={{ margin: 0, marginBottom: '20px', color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>{title}</h2>
      {children}
    </section>
  );
}

function Monthly({ isDark, workouts, t, isMobile }) {
  const byMonth = {};
  workouts.forEach(w => {
    if (!w.completedAt) return;
    const d = new Date(w.completedAt);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { sessions: 0, series: 0, reps: 0, volume: 0, timeMin: 0 };
    byMonth[key].sessions += 1;
    byMonth[key].series += Number(w.series || 0);
    byMonth[key].reps += Number(w.totalReps || 0);
    byMonth[key].volume += Number(w.totalVolume || 0);
    byMonth[key].timeMin += w.elapsedTime !== undefined ? Math.round((Number(w.elapsedTime || 0)) / 60) : Number(w.totalTime || 0);
  });
  const entries = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));
  
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <Section title="📅 Informe Mensual" isDark={isDark}>
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
          <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>{t('stats_no_data')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {entries.map(([month, v], index) => (
            <div key={month} style={{ 
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(29, 209, 161, 0.1)',
                    color: '#1dd1a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    {index + 1}
                  </div>
                  <strong style={{ color: isDark ? '#fff' : '#333', fontSize: '1.1rem' }}>{formatMonth(month)}</strong>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{v.sessions} entrenamientos</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '10px' }}>
                <MiniStat label="Entrenos" value={v.sessions} isDark={isDark} />
                <MiniStat label="Series" value={v.series} isDark={isDark} />
                <MiniStat label="Reps" value={v.reps} isDark={isDark} />
                <MiniStat label="Volumen" value={v.volume.toLocaleString()} isDark={isDark} />
                <MiniStat label="Tiempo" value={v.timeMin} isDark={isDark} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function MiniStat({ label, value, isDark }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', color: isDark ? '#888' : '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>{value}</div>
    </div>
  );
}

function ExerciseStats({ isDark, workouts, t, isMobile }) {
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
  
  const exerciseIcons = {
    'press': '🏋️',
    'curl': '💪',
    'squat': '🦵',
    'deadlift': '🏋️',
    'pull': '💪',
    'push': '💪',
    'lunge': '🦵',
    'plank': '🎯',
    'row': '💪',
    'extension': '💪'
  };
  
  const getExerciseIcon = (name) => {
    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(exerciseIcons)) {
      if (lowerName.includes(key)) return icon;
    }
    return '🏋️';
  };

  return (
    <Section title="🏋️ Estadísticas por Ejercicio" isDark={isDark}>
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar ejercicio..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '14px 16px 14px 48px', 
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
        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>🔍</div>
      </div>
      {results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏋️</div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '1.5rem' }}>{getExerciseIcon(name)}</div>
                  <strong style={{ color: isDark ? '#fff' : '#333', fontSize: '1rem' }}>{name}</strong>
                </div>
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
    </Section>
  );
}
