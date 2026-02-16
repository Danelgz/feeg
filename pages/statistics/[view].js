import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import BodyHeatmap from "../../components/BodyHeatmap";

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
          <BodyHeatmapWrapper muscleStats={muscleStats} t={t} isDark={isDark} isMobile={isNarrow} />
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

function BodyHeatmapWrapper({ muscleStats, t, isDark, isMobile }) {
  const { counts, getColor, getIntensity } = muscleStats;
  const [manualLevels, setManualLevels] = useState({});

  const handleMuscleClick = (id) => {
    const currentLevel = manualLevels[id] !== undefined ? manualLevels[id] : getIntensity(counts[id] || 0);
    const nextLevel = (currentLevel + 1) % 5;
    setManualLevels(prev => ({ ...prev, [id]: nextLevel }));
  };

  const levelColors = {
    0: isDark ? "#262626" : "#eeeeee",
    1: "#0a4231",
    2: "#147a5b",
    3: "#2fd6a2",
    4: "#84fcdb"
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, width: '100%', position: 'relative' }}>
        <BodyHeatmap 
          counts={counts} 
          manualLevels={manualLevels} 
          onMuscleClick={handleMuscleClick} 
          isDark={isDark} 
        />
      </div>
      
      <div style={{ flex: 1, width: '100%', maxWidth: '500px' }}>
        <div style={{ marginBottom: '25px', textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ fontSize: '0.75rem', color: isDark ? '#555' : '#999', marginBottom: '12px', fontWeight: '900', letterSpacing: '1px' }}>INTENSIDAD DE ENTRENAMIENTO (HAZ CLICK EN LOS MÚSCULOS)</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4].map(lvl => (
              <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#0a0a0a' : '#f8f8f8', padding: '6px 10px', borderRadius: '10px', border: `1px solid ${isDark ? '#1a1a1a' : '#eee'}` }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '3px', 
                  backgroundColor: levelColors[lvl], 
                  boxShadow: lvl > 0 ? `0 0 8px ${levelColors[lvl]}` : 'none',
                  border: lvl === 0 ? `1px solid ${isDark ? '#333' : '#ccc'}` : 'none'
                }} />
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: isDark ? '#666' : '#666' }}>Nivel {lvl}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {Object.entries(counts).sort((a,b) => (t(a[0]) || a[0]).localeCompare(t(b[0]) || b[0])).map(([m, val]) => {
            const level = manualLevels[m] !== undefined ? manualLevels[m] : getIntensity(val);
            const levelColor = levelColors[level];
            return (
              <div key={m} 
                onClick={() => handleMuscleClick(m)}
                style={{ 
                  display: 'flex', flexDirection: 'column', padding: '15px', 
                  backgroundColor: isDark ? '#111' : '#fff', borderRadius: '16px', 
                  border: `1px solid ${isDark ? '#222' : '#eee'}`,
                  borderBottom: `4px solid ${levelColor}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: isDark ? '#666' : '#999', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>{t(m) || m}</span>
                <span style={{ fontSize: '1.2rem', color: isDark ? '#fff' : '#000', fontWeight: '900' }}>{val} <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#1dd1a1' }}>SERIES</span></span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
  return <p style={{ color: isDark ? '#aaa' : '#666' }}>Módulo de informe mensual en desarrollo.</p>;
}

function ExerciseStats({ isDark, workouts, t, isMobile }) {
  return <p style={{ color: isDark ? '#aaa' : '#666' }}>Módulo de estadísticas de ejercicios en desarrollo.</p>;
}
