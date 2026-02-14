import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";

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
      return '#1dd1a1';
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

      {/* Botones de navegación de estadísticas */}
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
          <BodyHeatmap muscleStats={muscleStats} t={t} isDark={isDark} isMobile={isNarrow} />
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

function BodyHeatmap({ muscleStats, t, isDark, isMobile }) {
  const { counts, getColor, getIntensity } = muscleStats;

  const MuscleGroup = ({ id, paths, muscle }) => {
    const intensity = getIntensity(muscle || id);
    const color = getColor(intensity);
    return (
      <g id={id} style={{ transition: 'all 0.4s ease' }}>
        {paths.map((p, i) => (
          <path 
            key={i} 
            d={p} 
            fill={color} 
            stroke={isDark ? "#000" : "#fff"} 
            strokeWidth="0.3" 
            style={{ transition: 'fill 0.4s ease' }} 
          />
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
        backgroundColor: isDark ? '#080808' : '#f9f9f9', 
        padding: '20px', 
        borderRadius: '24px', 
        flexShrink: 0,
        border: `1px solid ${isDark ? '#222' : '#eee'}`,
        margin: isMobile ? '0 auto' : '0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: '8px', fontWeight: '800', letterSpacing: '1px' }}>FRONTAL</div>
          <svg width={isMobile ? "140" : "170"} height={isMobile ? "280" : "340"} viewBox="0 0 200 400">
            <path d="M100,15 Q115,15 115,35 L115,55 Q135,65 145,85 L155,140 Q160,165 150,170 L142,165 L138,230 L148,365 L128,380 L115,255 L100,255 L85,255 L72,380 L52,365 L62,230 L58,165 L50,170 Q40,165 45,140 L55,85 Q65,65 85,55 L85,35 Q85,15 100,15" fill={silhouetteColor} />
            <MuscleGroup id="Pecho" paths={[
              "M102,80 Q125,75 142,95 L140,130 Q120,145 102,135 Z",
              "M98,80 Q75,75 58,95 L60,130 Q80,145 98,135 Z"
            ]} />
            <MuscleGroup id="Abdomen" paths={[
              "M85,145 L115,145 L112,165 L88,165 Z", "M88,170 L112,170 L110,190 L90,190 Z", "M90,195 L110,195 L108,220 L92,220 Z",
              "M115,145 L125,145 L130,220 L120,225 L112,220 Z", "M85,145 L75,145 L70,220 L80,225 L88,220 Z"
            ]} />
            <MuscleGroup id="Hombros" paths={["M144,82 Q158,82 162,110 L146,125 Z", "M56,82 Q42,82 38,110 L54,125 Z"]} />
            <MuscleGroup id="Bíceps" paths={["M150,128 Q162,135 158,165 L145,165 L145,135 Z", "M50,128 Q38,135 42,165 L55,165 L55,135 Z"]} />
            <MuscleGroup id="Cuádriceps" paths={[
              "M105,245 L138,245 L145,320 L115,320 Q105,280 105,245 Z",
              "M95,245 L62,245 L55,320 L85,320 Q95,280 95,245 Z"
            ]} />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: '8px', fontWeight: '800', letterSpacing: '1px' }}>POSTERIOR</div>
          <svg width={isMobile ? "140" : "170"} height={isMobile ? "280" : "340"} viewBox="0 0 200 400">
            <path d="M100,15 Q115,15 115,35 L115,55 Q135,65 145,85 L155,140 Q160,165 150,170 L142,165 L138,230 L148,365 L128,380 L115,255 L100,255 L85,255 L72,380 L52,365 L62,230 L58,165 L50,170 Q40,165 45,140 L55,85 Q65,65 85,55 L85,35 Q85,15 100,15" fill={silhouetteColor} />
            <MuscleGroup id="Espalda" paths={["M100,60 L142,85 L138,150 Q100,175 62,150 L58,85 Z", "M85,55 Q100,45 115,55 L100,100 Z"]} />
            <MuscleGroup id="Tríceps" paths={["M146,125 L158,125 Q168,150 160,170 L146,170 Z", "M54,125 L42,125 Q32,150 40,170 L54,170 Z"]} />
            <MuscleGroup id="Glúteos" paths={["M100,225 Q140,225 145,265 L100,275 Z", "M100,225 Q60,225 55,265 L100,275 Z"]} />
            <MuscleGroup id="Femoral" paths={["M105,280 L142,280 L138,340 L110,340 Z", "M95,280 L58,280 L62,340 L90,340 Z"]} />
            <MuscleGroup id="Gemelos" paths={["M115,345 L145,345 L140,385 L120,385 Z", "M85,345 L55,345 L60,385 L80,385 Z"]} />
          </svg>
        </div>
      </div>
      <div style={{ flex: 1, width: '100%' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: isDark ? '#666' : '#999', marginBottom: '10px', fontWeight: '800' }}>INTENSIDAD (ÚLTIMOS 30 DÍAS)</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4].map(lvl => (
              <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: isDark ? '#111' : '#f5f5f5', padding: '4px 8px', borderRadius: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: getColor(lvl) }} />
                <span style={{ fontSize: '0.7rem', color: isDark ? '#999' : '#666' }}>L{lvl}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
          {Object.entries(counts).sort((a,b) => b[1] - a[1]).map(([m, val]) => (
            <div key={m} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', 
              backgroundColor: isDark ? '#161616' : '#fff', borderRadius: '12px', border: `1px solid ${isDark ? '#222' : '#eee'}`,
              borderLeft: `5px solid ${getColor(getIntensity(val))}`
            }}>
              <span style={{ fontWeight: 700, color: isDark ? '#eee' : '#333' }}>{t(m) || m}</span>
              <span style={{ color: '#1dd1a1', fontWeight: 'bold' }}>{val} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666' }}>series</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
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
  const results = Object.entries(index).filter(([name]) => name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Section title="Estadísticas Ejercicios" isDark={isDark}>
      <input
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        placeholder={t('search_exercise')}
        style={{
          width: '100%', padding: isMobile ? '10px' : '10px 12px', borderRadius: 8, border: `1px solid ${isDark ? '#333' : '#ddd'}`,
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px', marginTop: 8 }}>
                <MiniStat label={t('completed_workouts')} value={v.sessions} isDark={isDark} />
                <MiniStat label={t('total_series')} value={v.series} isDark={isDark} />
                <MiniStat label={t('reps_label')} value={v.reps} isDark={isDark} />
                <MiniStat label={t('total_volume_kg')} value={v.volume.toLocaleString()} isDark={isDark} />
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
    <div style={{ backgroundColor: isDark ? '#111' : '#fff', borderRadius: '6px', padding: '8px' }}>
      <p style={{ margin: 0, color: isDark ? '#888' : '#777', fontSize: '0.7rem' }}>{label}</p>
      <p style={{ margin: 0, color: isDark ? '#ddd' : '#333', fontWeight: 600, fontSize: '0.9rem' }}>{value ?? '-'}</p>
    </div>
  );
}
