import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import Link from "next/link";

export default function Statistics() {
  const { t, theme, isMobile, completedWorkouts: workouts } = useUser();
  const isDark = theme === 'dark';
  const [activeView, setActiveView] = useState('overview');
  const [isNarrow, setIsNarrow] = useState(false);

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

  const stats = useMemo(() => {
    if (!workouts || workouts.length === 0) {
      return {
        sessions: 0,
        totalSeries: 0,
        totalReps: 0,
        totalVolume: 0,
        totalTimeMin: 0,
        lastDate: null,
      };
    }
    const sorted = [...workouts].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    const aggregate = workouts.reduce((acc, w) => {
      acc.totalSeries += Number(w.series || 0);
      acc.totalReps += Number(w.totalReps || 0);
      acc.totalVolume += Number(w.totalVolume || 0);
      if (w.elapsedTime !== undefined) {
        acc.totalTimeMin += Math.round((Number(w.elapsedTime || 0)) / 60);
      } else {
        acc.totalTimeMin += Number(w.totalTime || 0);
      }
      return acc;
    }, { totalSeries: 0, totalReps: 0, totalVolume: 0, totalTimeMin: 0 });

    return {
      sessions: workouts.length,
      totalSeries: aggregate.totalSeries,
      totalReps: aggregate.totalReps,
      totalVolume: aggregate.totalVolume,
      totalTimeMin: aggregate.totalTimeMin,
      lastDate: sorted[0]?.completedAt || null,
    };
  }, [workouts]);

  // Series por grupo muscular (últimos 30 días para el mapa corporal)
  const muscleStats = useMemo(() => {
    const counts = {};
    Object.keys(groupMap).forEach(g => counts[g] = 0);
    
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    workouts.forEach(w => {
      if (!w.completedAt) return;
      const workoutDate = new Date(w.completedAt);
      if (workoutDate < thirtyDaysAgo) return;

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
      if (ratio <= 0.50) return 2;
      if (ratio <= 0.75) return 3;
      return 4;
    };

    const getColor = (intensity) => {
      if (intensity === 0) return isDark ? '#2a2a2a' : '#eeeeee';
      if (intensity === 1) return 'rgba(29, 209, 161, 0.3)';
      if (intensity === 2) return 'rgba(29, 209, 161, 0.55)';
      if (intensity === 3) return 'rgba(29, 209, 161, 0.8)';
      return '#1dd1a1'; // Nivel 4: Menta fuerte
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

  const navButtons = [
    { key: 'seriesByGroup', label: 'Series por grupo muscular', href: '/statistics/series' },
    { key: 'distChart', label: 'Distribución de músculos (gráfico)', href: '/statistics/distribution' },
    { key: 'distBody', label: 'Distribución de músculos (cuerpo)', href: '/statistics/body' },
    { key: 'monthly', label: 'Informe mensual', href: '/statistics/monthly' },
    { key: 'exerciseStats', label: 'Estadísticas Ejercicios', href: '/statistics/exercises' }
  ];

  return (
    <Layout>
      <h1 style={{ fontSize: isNarrow ? "1.6rem" : "2rem", marginBottom: isNarrow ? "0.8rem" : "1rem", color: isDark ? "#fff" : "#333" }}>
        {t("statistics")} <span style={{ color: isDark ? "#aaa" : "#777", fontSize: isNarrow ? "0.8rem" : "0.9rem" }}>{t("stats_in_development")}</span>
      </h1>

      {/* Botonera de navegación global */}
      <div style={{
        backgroundColor: isDark ? '#0f0f0f' : '#f6fefb',
        border: `1px solid ${isDark ? '#2a2a2a' : '#d9f7ef'}`,
        borderRadius: 12,
        padding: isNarrow ? '8px' : '10px',
        marginBottom: isNarrow ? '12px' : '16px'
      }}>
        {navButtons.map((btn) => (
          <Link
            key={btn.key}
            href={btn.href}
            role="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: isNarrow ? '10px' : '12px',
              margin: '6px 0',
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              border: `1px solid ${isDark ? '#2a2a2a' : '#e4f7f0'}`,
              borderRadius: 10,
              boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
              color: isDark ? '#eafff8' : '#0a3d31',
              textDecoration: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.1s ease, box-shadow 0.2s ease, background-color 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = isDark ? '0 0 0 rgba(0,0,0,0)' : '0 3px 8px rgba(0,0,0,0.10)'; e.currentTarget.style.backgroundColor = isDark ? '#161616' : '#fafffd'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.06)'; e.currentTarget.style.backgroundColor = isDark ? '#1a1a1a' : '#ffffff'; }}
          >
            <span aria-hidden="true" style={{ color: '#1dd1a1', opacity: 0.95, fontWeight: 800 }}>›</span>
            <span style={{ flex: 1 }}>{btn.label}</span>
          </Link>
        ))}
      </div>

      {/* Visualización de cuerpo con intensidad menta */}
      <section style={{
        backgroundColor: isDark ? '#111' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: 0, marginBottom: '16px', color: isDark ? '#fff' : '#333', fontSize: isNarrow ? '1rem' : '1.05rem' }}>
          Distribución de músculos (últimos 30 días) {workouts.length === 0 && <span style={{ color: isDark ? '#aaa' : '#777' }}>· {t('stats_no_data')}</span>}
        </h2>
        <BodyHeatmap muscleStats={muscleStats} t={t} isDark={isDark} isMobile={isNarrow} />
      </section>

      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isNarrow ? '1fr 1fr' : 'repeat(5, 1fr)',
        gap: isNarrow ? '10px' : '12px',
        marginBottom: '20px'
      }}>
        <StatCard label={t('completed_workouts')} value={stats.sessions} isDark={isDark} />
        <StatCard label={t('total_series')} value={stats.totalSeries} isDark={isDark} />
        <StatCard label={t('reps_label')} value={stats.totalReps} isDark={isDark} />
        <StatCard label={t('total_volume_kg')} value={stats.totalVolume.toLocaleString()} isDark={isDark} />
        <StatCard label={t('total_time_min')} value={stats.totalTimeMin} isDark={isDark} />
      </div>

      {/* Contenido según vista activa */}
      {activeView === 'overview' && (
        <OverviewSection isDark={isDark} isMobile={isMobile} workouts={workouts} t={t} />
      )}
      {activeView === 'seriesByGroup' && (
        <SeriesByGroupSection isDark={isDark} seriesByGroup={seriesByGroup} t={t} />
      )}
      {activeView === 'distChart' && (
        <DistributionChartSection isDark={isDark} seriesByGroup={seriesByGroup} t={t} />
      )}
      {activeView === 'distBody' && (
        <WeeklyBodyMapSection isDark={isDark} workouts={workouts} t={t} />
      )}
      {activeView === 'monthly' && (
        <MonthlyReportSection isDark={isDark} workouts={workouts} t={t} />
      )}
      {activeView === 'exerciseStats' && (
        <ExerciseStatsSection isDark={isDark} workouts={workouts} t={t} />
      )}
    </Layout>
  );
}

function OverviewSection({ isDark, isMobile, workouts, t }) {
  const items = workouts
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 10);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
      gap: '16px'
    }}>
      <section style={{
        backgroundColor: isDark ? '#1a1a1a' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
        borderRadius: '10px',
        padding: '16px'
      }}>
        <h2 style={{ margin: 0, marginBottom: '12px', color: isDark ? '#fff' : '#333', fontSize: '1.1rem' }}>{t('stats_overview')}</h2>
        {workouts.length === 0 ? (
          <p style={{ color: isDark ? '#aaa' : '#666' }}>{t('stats_no_data')}</p>
        ) : (
          <div style={{ maxHeight: '360px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {items.map(w => (
              <div key={w.id} style={{
                backgroundColor: isDark ? '#0f0f0f' : '#f9f9f9',
                border: isDark ? '1px solid #2a2a2a' : '1px solid #eee',
                borderRadius: '8px',
                padding: isMobile ? '10px' : '12px',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ color: '#1dd1a1' }}>{w.name}</strong>
                  <span style={{ color: isDark ? '#aaa' : '#666', fontSize: '0.85rem' }}>
                    {w.completedAt ? new Date(w.completedAt).toLocaleDateString() : ''}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px', marginTop: '8px' }}>
                  <MiniStat label={t('exercises_count')} value={w.exercises} isDark={isDark} />
                  <MiniStat label={t('series_label')} value={w.series} isDark={isDark} />
                  <MiniStat label={t('reps_label')} value={w.totalReps} isDark={isDark} />
                  <MiniStat label={t('total_volume_kg')} value={(w.totalVolume||0).toLocaleString()} isDark={isDark} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{
        backgroundColor: isDark ? '#1a1a1a' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
        borderRadius: '10px',
        padding: '16px'
      }}>
        <h2 style={{ margin: 0, marginBottom: '12px', color: isDark ? '#fff' : '#333', fontSize: '1.1rem' }}>{t('stats_recent')}</h2>
        {workouts.length === 0 ? (
          <p style={{ color: isDark ? '#aaa' : '#666' }}>{t('stats_no_data')}</p>
        ) : (
          <p style={{ color: isDark ? '#aaa' : '#666' }}>{t('completed_workouts')}: {workouts.length}</p>
        )}
      </section>
    </div>
  );
}

function SeriesByGroupSection({ isDark, seriesByGroup, t }) {
  const entries = Object.entries(seriesByGroup).sort((a,b) => b[1]-a[1]);
  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '16px'
    }}>
      <h2 style={{ margin: 0, marginBottom: '12px', color: isDark ? '#fff' : '#333', fontSize: '1.1rem' }}>Series por grupo muscular</h2>
      {entries.length === 0 ? (
        <p style={{ color: isDark ? '#aaa' : '#666' }}>{t('stats_no_data')}</p>
      ) : (
        <div>
          {entries.map(([g, n]) => (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '140px', color: isDark ? '#ddd' : '#444' }}>{t(g) || g}</div>
              <div style={{ flex: 1, height: '10px', background: isDark ? '#0f0f0f' : '#eee', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${n === 0 ? 2 : Math.min(100, (n/Math.max(1, entries[0][1]))*100)}%`, height: '100%', background: '#1dd1a1' }} />
              </div>
              <div style={{ width: '40px', textAlign: 'right', color: isDark ? '#aaa' : '#666' }}>{n}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DistributionChartSection({ isDark, seriesByGroup, t }) {
  const total = Object.values(seriesByGroup).reduce((a,b)=>a+b,0) || 1;
  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '16px'
    }}>
      <h2 style={{ margin: 0, marginBottom: '12px', color: isDark ? '#fff' : '#333', fontSize: '1.1rem' }}>Distribución de músculos (gráfico)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
        {Object.entries(seriesByGroup).map(([g,n]) => (
          <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '120px', color: isDark ? '#ddd' : '#444' }}>{t(g) || g}</div>
            <div style={{ flex: 1, height: '10px', background: isDark ? '#0f0f0f' : '#eee', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${(n/total)*100}%`, height: '100%', background: '#1dd1a1' }} />
            </div>
            <div style={{ width: '60px', textAlign: 'right', color: isDark ? '#aaa' : '#666' }}>{Math.round((n/total)*100)}%</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WeeklyBodyMapSection({ isDark, workouts, t }) {
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '16px'
    }}>
      <h2 style={{ margin: 0, marginBottom: '12px', color: isDark ? '#fff' : '#333', fontSize: '1.1rem' }}>Distribución de músculos (cuerpo) — semanal</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {days.map((d) => (
          <div key={d} style={{ background: isDark ? '#0f0f0f' : '#f5f5f5', border: isDark ? '1px solid #2a2a2a' : '1px solid #eee', borderRadius: 8, padding: 8, textAlign: 'center', color: isDark ? '#aaa' : '#666' }}>
            {d}
          </div>
        ))}
      </div>
    </section>
  );
}

function MonthlyReportSection({ isDark, workouts, t }) {
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
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '16px'
    }}>
      <h2 style={{ margin: 0, marginBottom: '12px', color: isDark ? '#fff' : '#333', fontSize: '1.1rem' }}>Informe mensual</h2>
      {entries.length === 0 ? (
        <p style={{ color: isDark ? '#aaa' : '#666' }}>{t('stats_no_data')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {entries.map(([month, v]) => (
            <div key={month} style={{ background: isDark ? '#0f0f0f' : '#f9f9f9', border: isDark ? '1px solid #2a2a2a' : '1px solid #eee', borderRadius: 8, padding: 12 }}>
              <strong style={{ color: isDark ? '#fff' : '#333' }}>{month}</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: 8 }}>
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
    </section>
  );
}

function ExerciseStatsSection({ isDark, workouts, t }) {
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
  const results = Object.entries(index).filter(([name]) => name.toLowerCase().includes(q.toLowerCase()));
  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '16px'
    }}>
      <h2 style={{ margin: 0, marginBottom: '12px', color: isDark ? '#fff' : '#333', fontSize: '1.1rem' }}>Estadísticas Ejercicios</h2>
      <input
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        placeholder={t('search_exercise')}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${isDark ? '#333' : '#ddd'}`,
          background: isDark ? '#0f0f0f' : '#fafafa', color: isDark ? '#fff' : '#333', outline: 'none', marginBottom: 12
        }}
      />
      {results.length === 0 ? (
        <p style={{ color: isDark ? '#aaa' : '#666' }}>{t('no_exercises_found')}</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {results.map(([name, v]) => (
            <div key={name} style={{ background: isDark ? '#0f0f0f' : '#f9f9f9', border: isDark ? '1px solid #2a2a2a' : '1px solid #eee', borderRadius: 8, padding: 12 }}>
              <strong style={{ color: '#1dd1a1' }}>{name}</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: 8 }}>
                <MiniStat label={t('completed_workouts')} value={v.sessions} isDark={isDark} />
                <MiniStat label={t('total_series')} value={v.series} isDark={isDark} />
                <MiniStat label={t('reps_label')} value={v.reps} isDark={isDark} />
                <MiniStat label={t('total_volume_kg')} value={v.volume.toLocaleString()} isDark={isDark} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BodyHeatmap({ muscleStats, t, isDark, isMobile }) {
  const { counts, getColor, getIntensity } = muscleStats;

  const MuscleGroup = ({ id, paths, muscle }) => {
    const intensity = getIntensity(muscle || id);
    const color = getColor(intensity);
    return (
      <g id={id}>
        {paths.map((p, i) => (
          <path key={i} d={p} fill={color} stroke={isDark ? "#111" : "#fff"} strokeWidth="0.5" style={{ transition: 'fill 0.4s ease' }} />
        ))}
      </g>
    );
  };

  const silhouetteColor = isDark ? "#1a1a1a" : "#e0e0e0";

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'flex-start' }}>
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        backgroundColor: isDark ? '#000' : '#f5f5f5', 
        padding: '20px', 
        borderRadius: '20px', 
        flexShrink: 0,
        boxShadow: isDark ? 'inset 0 0 10px rgba(0,0,0,0.5)' : 'none',
        margin: isMobile ? '0 auto' : '0'
      }}>
        {/* FRONT VIEW */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: '#888', marginBottom: '5px', fontWeight: 'bold' }}>FRONTAL</div>
          <svg width={isMobile ? "130" : "150"} height={isMobile ? "260" : "300"} viewBox="0 0 200 400">
            {/* Silhouette Base */}
            <path d="M100,20 Q120,20 120,40 L120,60 Q140,70 150,90 L160,150 Q165,170 155,175 L145,170 L140,240 L150,370 L130,380 L120,260 L100,260 L80,260 L70,380 L50,370 L60,240 L55,170 L45,175 Q35,170 40,150 L50,90 Q60,70 80,60 L80,40 Q80,20 100,20" fill={silhouetteColor} />
            
            {/* Muscle Groups Front */}
            <MuscleGroup id="Pecho" paths={[
              "M102,85 Q125,80 140,95 L140,125 Q120,135 102,130 Z", // Right
              "M98,85 Q75,80 60,95 L60,125 Q80,135 98,130 Z"    // Left
            ]} />
            <MuscleGroup id="Abdomen" paths={[
              "M75,140 L125,140 L120,220 L80,220 Z",
              "M85,145 L115,145 L112,170 L88,170 Z",
              "M88,175 L112,175 L110,200 L90,200 Z"
            ]} />
            <MuscleGroup id="Hombros" paths={[
              "M142,85 Q155,85 160,110 L145,120 Z", // Right
              "M58,85 Q45,85 40,110 L55,120 Z"     // Left
            ]} />
            <MuscleGroup id="Bíceps" paths={[
              "M148,125 Q160,130 158,160 L145,160 Z", // Right
              "M52,125 Q40,130 42,160 L55,160 Z"    // Left
            ]} />
            <MuscleGroup id="Cuádriceps" paths={[
              "M105,245 L138,245 L145,310 L115,310 Z", // Right
              "M95,245 L62,245 L55,310 L85,310 Z"     // Left
            ]} />
          </svg>
        </div>

        {/* BACK VIEW */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: '#888', marginBottom: '5px', fontWeight: 'bold' }}>POSTERIOR</div>
          <svg width={isMobile ? "130" : "150"} height={isMobile ? "260" : "300"} viewBox="0 0 200 400">
            <path d="M100,20 Q120,20 120,40 L120,60 Q140,70 150,90 L160,150 Q165,170 155,175 L145,170 L140,240 L150,370 L130,380 L120,260 L100,260 L80,260 L70,380 L50,370 L60,240 L55,170 L45,175 Q35,170 40,150 L50,90 Q60,70 80,60 L80,40 Q80,20 100,20" fill={silhouetteColor} />
            
            <MuscleGroup id="Espalda" paths={[
              "M100,65 L140,85 L135,140 Q100,160 65,140 L60,85 Z", // Upper & Lats
              "M80,65 L100,120 L120,65 Z" // Traps
            ]} />
            <MuscleGroup id="Tríceps" paths={[
              "M145,120 L155,120 Q165,145 158,165 L145,165 Z", // Right
              "M55,120 L45,120 Q35,145 42,165 L55,165 Z"    // Left
            ]} />
            <MuscleGroup id="Glúteos" paths={[
              "M100,225 Q135,225 140,260 L100,270 Z", // Right
              "M100,225 Q65,225 60,260 L100,270 Z"    // Left
            ]} />
            <MuscleGroup id="Femoral" paths={[
              "M105,275 L140,275 L135,330 L110,330 Z", // Right
              "M95,275 L60,275 L65,330 L90,330 Z"    // Left
            ]} />
            <MuscleGroup id="Gemelos" paths={[
              "M115,340 L145,340 L140,385 L120,385 Z", // Right
              "M85,340 L55,340 L60,385 L80,385 Z"    // Left
            ]} />
          </svg>
        </div>
      </div>

      <div style={{ flex: 1, width: '100%' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '10px', fontWeight: 'bold' }}>NIVELES DE INTENSIDAD</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[0, 1, 2, 3, 4].map(lvl => (
              <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: getColor(lvl), border: isDark ? '1px solid #333' : '1px solid #ddd' }} />
                <span style={{ fontSize: '0.7rem', color: isDark ? '#666' : '#999' }}>L{lvl}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
          {Object.entries(counts).sort((a,b) => b[1] - a[1]).map(([m, val]) => (
            <div key={m} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px 14px', 
              backgroundColor: isDark ? '#1a1a1a' : '#fff', 
              borderRadius: '10px',
              border: `1px solid ${isDark ? '#222' : '#eee'}`,
              borderLeft: `4px solid ${getColor(getIntensity(val))}`
            }}>
              <span style={{ fontWeight: 600, color: isDark ? '#ddd' : '#333' }}>{t(m) || m}</span>
              <span style={{ color: '#1dd1a1', fontWeight: 'bold' }}>{val} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666' }}>series</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, isDark }) {
  return (
    <div style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '14px',
      textAlign: 'center'
    }}>
      <p style={{ margin: 0, marginBottom: '6px', color: isDark ? '#aaa' : '#666', fontSize: '0.85rem' }}>{label}</p>
      <p style={{ margin: 0, color: '#1dd1a1', fontSize: '1.3rem', fontWeight: 'bold' }}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, isDark }) {
  return (
    <div style={{ backgroundColor: isDark ? '#111' : '#fff', borderRadius: '6px', padding: '8px' }}>
      <p style={{ margin: 0, color: isDark ? '#888' : '#777', fontSize: '0.75rem' }}>{label}</p>
      <p style={{ margin: 0, color: isDark ? '#ddd' : '#333', fontWeight: 600 }}>{value ?? '-'}</p>
    </div>
  );
}
