import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BodyStatsSVG from "../../components/BodyStatsSVG";

export default function StatisticsView() {
  const router = useRouter();
  const { view } = router.query;
  const { t, theme, isMobile } = useUser();
  const isDark = theme === 'dark';
  const [workouts, setWorkouts] = useState([]);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('completedWorkouts');
      if (saved) setWorkouts(JSON.parse(saved));
    } catch (e) {
      console.error('Error reading completedWorkouts', e);
    }
  }, []);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const groupMap = {
    Pecho: ['Pecho', 'Chest'],
    Espalda: ['Espalda', 'Back'],
    Hombros: ['Hombros', 'Shoulders'],
    Bíceps: ['Bíceps', 'Biceps'],
    Tríceps: ['Tríceps', 'Triceps'],
    Cuádriceps: ['Cuádriceps', 'Quads'],
    Femoral: ['Femoral', 'Hamstrings'],
    Glúteos: ['Glúteos', 'Glutes'],
    Gemelos: ['Gemelos', 'Calves'],
    Abdomen: ['Abdomen', 'Abs', 'Core']
  };

  const muscleStats = useMemo(() => {
    const counts = {};
    Object.keys(groupMap).forEach(g => counts[g] = 0);
    
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    workouts.forEach(w => {
      if (!w.completedAt) return;
      const workoutDate = new Date(w.completedAt);
      if (workoutDate < sevenDaysAgo) return;

      if (Array.isArray(w.details)) {
        w.details.forEach(d => {
          const grp = d.muscleGroup || d.group || d.category;
          const found = Object.keys(groupMap).find(key => groupMap[key].includes(grp));
          if (found) counts[found] += Number(d.series || 0);
        });
      }
      if (!Array.isArray(w.details) && w.seriesByGroup) {
        Object.entries(w.seriesByGroup).forEach(([k,v]) => {
          const found = Object.keys(groupMap).find(key => groupMap[key].includes(k) || key === k);
          if (found) counts[found] += Number(v||0);
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
      if (intensity === 0) return isDark ? '#121212' : '#eeeeee';
      if (intensity === 1) return 'rgba(47, 214, 162, 0.2)';
      if (intensity === 2) return 'rgba(47, 214, 162, 0.45)';
      if (intensity === 3) return 'rgba(47, 214, 162, 0.7)';
      return '#2fd6a2';
    };

    return { counts, max, getIntensity, getColor };
  }, [workouts, isDark]);

  const seriesByGroup = useMemo(() => {
    const counts = {};
    Object.keys(groupMap).forEach(g => counts[g] = 0);
    workouts.forEach(w => {
      if (Array.isArray(w.details)) {
        w.details.forEach(d => {
          const grp = d.muscleGroup || d.group || d.category;
          const found = Object.keys(groupMap).find(key => groupMap[key].includes(grp));
          if (found) counts[found] += Number(d.series || 0);
        });
      }
      if (!Array.isArray(w.details) && w.seriesByGroup) {
        Object.entries(w.seriesByGroup).forEach(([k,v]) => {
          const found = Object.keys(groupMap).find(key => groupMap[key].includes(k) || key === k);
          if (found) counts[found] += Number(v||0);
        });
      }
    });
    return counts;
  }, [workouts]);

  const total = useMemo(() => Object.values(seriesByGroup).reduce((a, b) => a + b, 0) || 1, [seriesByGroup]);

  const nav = [
    { key: 'series', label: 'Series por grupo muscular', href: '/statistics/series' },
    { key: 'distribution', label: 'Distribución de músculos (gráfico)', href: '/statistics/distribution' },
    { key: 'body', label: 'Distribución de músculos (cuerpo)', href: '/statistics/body' },
    { key: 'monthly', label: 'Informe mensual', href: '/statistics/monthly' },
    { key: 'exercises', label: 'Estadísticas Ejercicios', href: '/statistics/exercises' }
  ];

  return (
    <Layout>
      <h1 style={{ fontSize: isNarrow ? "1.2rem" : "1.8rem", marginBottom: isNarrow ? "0.8rem" : "1rem", color: isDark ? "#fff" : "#333" }}>
        {t('statistics')} <span style={{ color: isDark ? "#aaa" : "#777", fontSize: isNarrow ? "0.7rem" : "0.8rem" }}>{t('stats_in_development')}</span>
      </h1>

      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '5px',
        WebkitOverflowScrolling: 'touch'
      }}>
        {nav.map(item => (
          <Link key={item.key} href={item.href} style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              padding: '8px 16px',
              backgroundColor: view === item.key ? '#1dd1a1' : (isDark ? '#1a1a1a' : '#fff'),
              border: `1px solid ${view === item.key ? '#1dd1a1' : (isDark ? '#333' : '#ddd')}`,
              borderRadius: '20px',
              color: view === item.key ? '#000' : (isDark ? '#fff' : '#333'),
              fontWeight: '600',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap'
            }}>
              {item.label}
            </div>
          </Link>
        ))}
      </div>

      {view === 'series' && (
        <Section title="Series por grupo muscular" isDark={isDark}>
          {Object.entries(seriesByGroup).length === 0 ? (
            <p style={{ color: isDark ? '#aaa' : '#666' }}>{t('stats_no_data')}</p>
          ) : (
            <div>
              {Object.entries(seriesByGroup).sort((a,b)=>b[1]-a[1]).map(([g,n], i, arr) => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: isNarrow ? '0.8rem' : '1rem' }}>
                  <div style={{ width: isNarrow ? '110px' : '140px', color: isDark ? '#ddd' : '#444' }}>{t(g) || g}</div>
                  <div style={{ flex: 1, height: '10px', background: isDark ? '#0f0f0f' : '#eee', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${n === 0 ? 2 : Math.min(100, (n/Math.max(1, arr[0][1]))*100)}%`, height: '100%', background: '#1dd1a1' }} />
                  </div>
                  <div style={{ width: '30px', textAlign: 'right', color: isDark ? '#aaa' : '#666' }}>{n}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {view === 'distribution' && (
        <Section title="Distribución de músculos (gráfico)" isDark={isDark}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            {Object.entries(seriesByGroup).map(([g,n]) => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: isNarrow ? '0.8rem' : '1rem' }}>
                <div style={{ width: isNarrow ? '110px' : '140px', color: isDark ? '#ddd' : '#444' }}>{t(g) || g}</div>
                <div style={{ flex: 1, height: '10px', background: isDark ? '#0f0f0f' : '#eee', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${(n/total)*100}%`, height: '100%', background: '#1dd1a1' }} />
                </div>
                <div style={{ width: '40px', textAlign: 'right', color: isDark ? '#aaa' : '#666' }}>{Math.round((n/total)*100)}%</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {view === 'body' && (
        <Section title="Distribución de músculos (cuerpo)" isDark={isDark}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <BodyStatsSVG muscleStats={muscleStats} isDark={isDark} />
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

function Section({ title, isDark, children }) {
  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '16px'
    }}>
      <h2 style={{ margin: 0, marginBottom: '12px', color: isDark ? '#fff' : '#333', fontSize: '1rem' }}>{title}</h2>
      {children}
    </section>
  );
}

function Monthly({ isDark, workouts, t, isMobile }) {
  const byMonth = {};
  workouts.forEach(w => {
    if (!w.completedAt) return;
    const d = new Date(w.completedAt);
    const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
    if (!byMonth[key]) byMonth[key] = { sessions: 0, series: 0, reps: 0, volume: 0, timeMin: 0 };
    byMonth[key].sessions += 1;
    byMonth[key].series += Number(w.series||0);
    byMonth[key].reps += Number(w.totalReps||0);
    byMonth[key].volume += Number(w.totalVolume||0);
    byMonth[key].timeMin += w.elapsedTime !== undefined ? Math.round((Number(w.elapsedTime||0))/60) : Number(w.totalTime||0);
  });
  const entries = Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0]));
  return (
    <Section title="Informe mensual" isDark={isDark}>
      {entries.length === 0 ? (
        <p style={{ color: isDark ? '#aaa' : '#666' }}>{t('stats_no_data')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {entries.map(([month, v]) => (
            <div key={month} style={{ background: isDark ? '#0f0f0f' : '#f9f9f9', border: isDark ? '1px solid #2a2a2a' : '1px solid #eee', borderRadius: 8, padding: 12 }}>
              <strong style={{ color: isDark ? '#fff' : '#333' }}>{month}</strong>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '8px', marginTop: 8 }}>
                <MiniStat label={t('completed_workouts')} value={v.sessions} isDark={isDark} />
                <MiniStat label={t('total_series')} value={v.series} isDark={isDark} />
                <MiniStat label={t('reps_label')} value={v.reps} isDark={isDark} />
                <MiniStat label={t('total_volume_kg')} value={v.volume.toLocaleString()} isDark={isDark} />
                <MiniStat label={t('total_time_min')} value={v.timeMin} isDark={isDark} />
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
      <div style={{ fontSize: '0.65rem', color: isDark ? '#666' : '#999', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>{value}</div>
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
        index[name].series += Number(d.series||0);
        index[name].reps += Number(d.reps||0);
        index[name].volume += Number(d.weight||0) * Number(d.reps||0) * Number(d.series||1);
      });
    }
  });
  const results = Object.entries(index)
    .filter(([name]) => name.toLowerCase().includes(q.toLowerCase()))
    .sort((a,b) => b[1].sessions - a[1].sessions);

  return (
    <Section title="Estadísticas por Ejercicio" isDark={isDark}>
      <input 
        type="text" 
        placeholder="Buscar ejercicio..." 
        value={q} 
        onChange={e => setQ(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: isDark ? '1px solid #333' : '1px solid #ddd', background: isDark ? '#0f0f0f' : '#fff', color: isDark ? '#fff' : '#000' }}
      />
      <div style={{ display: 'grid', gap: '10px' }}>
        {results.map(([name, v]) => (
          <div key={name} style={{ background: isDark ? '#0f0f0f' : '#f9f9f9', padding: 12, borderRadius: 8 }}>
            <strong style={{ color: isDark ? '#fff' : '#333' }}>{name}</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: 8 }}>
              <MiniStat label="Sesiones" value={v.sessions} isDark={isDark} />
              <MiniStat label="Series" value={v.series} isDark={isDark} />
              <MiniStat label="Reps" value={v.reps} isDark={isDark} />
              <MiniStat label="Vol. Total" value={v.volume.toLocaleString()} isDark={isDark} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}