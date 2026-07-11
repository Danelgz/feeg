import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Icon, EmptyState, PageHeader } from "../../components/ui";

export default function StatisticsView() {
  const router = useRouter();
  const { view } = router.query;
  const { t, theme, isMobile, completedWorkouts: contextWorkouts } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
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
    { key: 'series', href: '/statistics/series', label: 'Series por grupo', description: 'Distribución de series por músculo' },
    { key: 'distribution', href: '/statistics/distribution', label: 'Distribución', description: 'Gráfico de distribución muscular' },
    { key: 'monthly', href: '/statistics/monthly', label: 'Mensual', description: 'Informe detallado por mes' },
    { key: 'exercises', href: '/statistics/exercises', label: 'Ejercicios', description: 'Estadísticas por ejercicio' }
  ];

  return (
    <Layout>
      <PageHeader
        isDark={isDark}
        isMobile={isNarrow}
        title={t('statistics')}
        subtitle="Analiza tu progreso y mejora tu entrenamiento con datos detallados"
      />

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
              backgroundColor: selectedPeriod === period.key ? tk.accent : tk.surface,
              border: `1px solid ${selectedPeriod === period.key ? tk.accent : tk.border}`,
              borderRadius: tk.radius.pill,
              color: selectedPeriod === period.key ? tk.onAccent : tk.text,
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: tk.transition
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
              backgroundColor: view === item.key ? tk.accentSoft : tk.surface,
              border: `2px solid ${view === item.key ? tk.accent : tk.border}`,
              borderRadius: tk.radius.lg,
              color: tk.text,
              textAlign: 'left',
              transition: tk.transition,
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              if (view !== item.key) {
                e.currentTarget.style.borderColor = tk.accent;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseOut={(e) => {
              if (view !== item.key) {
                e.currentTarget.style.borderColor = tk.border;
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '0.75rem', color: tk.textMuted }}>{item.description}</div>
            </div>
          </Link>
        ))}
      </div>

      {view === 'series' && (
        <Section title="Series por Grupo Muscular" isDark={isDark} isNarrow={isNarrow}>
          {total <= 1 && Object.values(seriesByGroup).every(v => v === 0) ? (
            <EmptyState isDark={isDark} icon="barChart" title={t('stats_no_data')} />
          ) : (
            <div>
              {Object.entries(seriesByGroup).sort((a, b) => b[1] - a[1]).map(([g, n], i, arr) => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '120px', color: tk.text, fontSize: '0.9rem', fontWeight: '500' }}>{t(g) || g}</div>
                  <div style={{ flex: 1, height: '20px', background: tk.surfaceAlt, borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${n === 0 ? 2 : Math.min(100, (n / Math.max(1, arr[0][1])) * 100)}%`,
                      height: '100%',
                      background: n > 0 ? `linear-gradient(90deg, ${tk.accent}, ${tk.accentHover})` : tk.border,
                      borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ width: '50px', textAlign: 'right', color: tk.text, fontWeight: 'bold', fontSize: '0.95rem' }}>{n}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {view === 'distribution' && (
        <Section title="Distribución Muscular" isDark={isDark} isNarrow={isNarrow}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {Object.entries(seriesByGroup).map(([g, n]) => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '120px', color: tk.text, fontSize: '0.9rem', fontWeight: '500' }}>{t(g) || g}</div>
                <div style={{ flex: 1, height: '20px', background: tk.surfaceAlt, borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(n / total) * 100}%`,
                    height: '100%',
                    background: n > 0 ? `linear-gradient(90deg, ${tk.accent}, ${tk.accentHover})` : tk.border,
                    borderRadius: '999px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <div style={{ width: '60px', textAlign: 'right', color: tk.text, fontWeight: 'bold', fontSize: '0.95rem' }}>{Math.round((n / total) * 100)}%</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {view === 'monthly' && (
        <Monthly isDark={isDark} tk={tk} workouts={workouts} t={t} isMobile={isNarrow} />
      )}

      {view === 'exercises' && (
        <ExerciseStats isDark={isDark} tk={tk} workouts={workouts} t={t} isMobile={isNarrow} />
      )}

      {!view && (
        <p style={{ color: tk.textMuted }}>{t('stats_no_data')}</p>
      )}
    </Layout>
  );
}

function Section({ title, isDark, children, isNarrow }) {
  const tk = getTokens(isDark);
  return (
    <section style={{
      backgroundColor: tk.surface,
      border: `1px solid ${tk.border}`,
      borderRadius: tk.radius.lg,
      padding: isNarrow ? '16px' : '24px'
    }}>
      <h2 style={{ margin: 0, marginBottom: '20px', color: tk.text, fontSize: '1.3rem', fontWeight: 'bold' }}>{title}</h2>
      {children}
    </section>
  );
}

function Monthly({ isDark, tk, workouts, t, isMobile }) {
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
    <Section title="Informe Mensual" isDark={isDark}>
      {entries.length === 0 ? (
        <EmptyState isDark={isDark} icon="clock" title={t('stats_no_data')} />
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {entries.map(([month, v], index) => (
            <div key={month} style={{
              background: tk.surfaceAlt,
              border: `1px solid ${tk.border}`,
              borderRadius: 12,
              padding: 16,
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = tk.accent;
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = tk.border;
              e.currentTarget.style.transform = 'translateX(0)';
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: tk.accentSoft,
                    color: tk.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    {index + 1}
                  </div>
                  <strong style={{ color: tk.text, fontSize: '1.1rem' }}>{formatMonth(month)}</strong>
                </div>
                <span style={{ fontSize: '0.85rem', color: tk.accent, fontWeight: '600' }}>{v.sessions} entrenamientos</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '10px' }}>
                <MiniStat label="Entrenos" value={v.sessions} tk={tk} />
                <MiniStat label="Series" value={v.series} tk={tk} />
                <MiniStat label="Reps" value={v.reps} tk={tk} />
                <MiniStat label="Volumen" value={v.volume.toLocaleString()} tk={tk} />
                <MiniStat label="Tiempo" value={v.timeMin} tk={tk} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function MiniStat({ label, value, tk }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', color: tk.textFaint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: tk.text }}>{value}</div>
    </div>
  );
}

function ExerciseStats({ isDark, tk, workouts, t, isMobile }) {
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
    <Section title="Estadísticas por Ejercicio" isDark={isDark}>
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Icon name="search" size={16} color={tk.textFaint} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 16px 14px 42px',
            borderRadius: 12,
            border: `1px solid ${tk.border}`,
            background: tk.surfaceAlt,
            color: tk.text,
            outline: 'none',
            fontSize: '1rem',
            transition: 'border-color 0.2s ease',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = tk.accent}
          onBlur={(e) => e.target.style.borderColor = tk.border}
        />
      </div>
      {results.length === 0 ? (
        <EmptyState isDark={isDark} icon="barChart" title={q ? t('no_exercises_found') : 'No hay datos de ejercicios'} />
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {results.map(([name, v], index) => (
            <div key={name} style={{
              background: tk.surfaceAlt,
              border: `1px solid ${tk.border}`,
              borderRadius: 12,
              padding: 16,
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = tk.accent;
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = tk.border;
              e.currentTarget.style.transform = 'translateX(0)';
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ color: tk.text, fontSize: '1rem' }}>{name}</strong>
                <span style={{ fontSize: '0.85rem', color: tk.accent, fontWeight: '600' }}>#{index + 1}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <MiniStat label="Sesiones" value={v.sessions} tk={tk} />
                <MiniStat label="Series" value={v.series} tk={tk} />
                <MiniStat label="Reps" value={v.reps} tk={tk} />
                <MiniStat label="Volumen" value={v.volume.toLocaleString()} tk={tk} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
