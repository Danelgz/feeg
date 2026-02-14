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
    Abdomen: ['Abdomen', 'Abs', 'Core'],
    Antebrazos: ['Antebrazos', 'Forearms'],
    Trapecio: ['Trapecio', 'Traps'],
    Oblicuos: ['Oblicuos', 'Obliques'],
    Cuello: ['Cuello', 'Neck']
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

  const FRONT_DATA = [
    { id: 'Pecho', points: ['51.8 41.6 51.0 55.1 57.9 57.9 67.7 55.5 70.6 47.3 62.0 41.6', '29.7 46.5 31.4 55.5 40.8 57.9 48.1 55.1 47.7 42.0 37.5 42.0'] },
    { id: 'Oblicuos', points: ['68.5 63.2 67.3 57.1 58.7 59.5 60 64.0 60.4 83.2 65.7 78.7 66.5 69.7', '33.8 78.3 33.0 71.8 31.0 63.2 32.2 57.1 40.8 59.1 39.1 63.2 39.1 83.6'] },
    { id: 'Abdomen', points: ['56.3 59.1 57.9 64.0 58.3 77.9 58.3 92.6 56.3 98.3 55.1 104.0 51.4 107.7 51.0 84.4 50.6 67.3 51.0 57.1', '43.6 58.7 48.5 57.1 48.9 67.3 48.5 84.4 48.1 107.3 44.4 103.6 40.8 91.4 40.8 78.3 41.2 64.4'] },
    { id: 'Bíceps', points: ['16.7 68.1 17.9 71.4 22.8 66.1 28.9 53.8 27.7 49.3 20.4 55.9', '71.4 49.3 70.2 54.6 76.3 66.1 81.6 71.8 82.8 68.9 78.7 55.5'] },
    { id: 'Cuello', points: ['55.5 23.6 50.6 33.4 50.6 39.1 61.6 40 70.6 44.8 69.3 36.7 63.2 35.1 58.3 30.6', '28.9 44.8 30.2 37.1 36.3 35.1 41.2 30.2 44.4 24.4 48.9 33.8 48.5 39.1 37.9 39.5'] },
    { id: 'Hombros', points: ['78.3 53.0 79.5 47.7 79.1 41.2 75.9 37.9 71.0 36.3 72.2 42.8 71.4 47.3', '28.1 47.3 21.2 53.0 20 47.7 20.4 41.2 24.4 37.1 28.5 37.1 26.9 43.2'] },
    { id: 'Cabeza', points: ['42.4 2.8 40 11.8 42.0 19.5 46.1 23.2 49.7 25.3 54.6 22.4 57.5 19.1 59.1 10.2 57.1 2.4 49.7 0'], decorative: true },
    { id: 'Cuádriceps', points: ['34.6 98.7 37.1 108.1 37.1 127.7 34.2 137.1 31.0 132.6 29.3 120 28.1 111.4 29.3 100.8 32.2 94.6', '63.2 105.7 64.4 100 66.9 94.6 70.2 101.2 71.0 111.8 68.1 133.0 65.3 137.5 62.4 128.5 62.0 111.4', '38.7 129.3 38.3 112.2 41.2 118.3 44.4 129.3 42.8 135.1 40 146.1 36.3 146.5 35.5 140', '59.5 145.7 55.5 128.9 60.8 113.8 61.2 130.2 64.0 139.5 62.8 146.5'] },
    { id: 'Antebrazos', points: ['6.1 88.5 10.2 75.1 14.6 70.2 16.3 74.2 19.1 73.4 4.4 97.5 0 100', '84.4 69.7 83.2 73.4 80 73.0 95.1 98.3 100 100.4 93.4 89.3 89.7 76.3', '77.5 72.2 77.5 77.5 80.4 84.0 85.3 89.7 92.2 101.2 94.6 99.5', '6.9 101.2 13.4 90.6 18.7 84.0 21.6 77.1 21.2 71.8 4.8 98.7'] }
  ];

  const BACK_DATA = [
    { id: 'Cabeza', points: ['50.6 0 45.9 0.8 40.8 5.5 40.4 12.7 45.1 20 55.7 20 59.1 13.6 59.5 4.6 55.7 1.2'], decorative: true },
    { id: 'Trapecio', points: ['44.6 21.7 47.6 21.7 47.2 38.2 47.6 64.6 38.2 53.1 35.3 40.8 31.0 36.5 39.1 33.1 43.8 27.2', '52.3 21.7 55.7 21.7 56.5 27.2 60.8 32.7 68.9 36.5 64.6 40.4 61.7 53.1 52.3 64.6 53.1 38.2'] },
    { id: 'Hombros', points: ['29.3 37.0 22.9 39.1 17.4 44.2 18.2 53.6 24.2 49.3 27.2 46.3', '71.0 37.0 78.2 39.5 82.5 44.6 81.7 53.6 74.8 48.9 72.3 45.1'] },
    { id: 'Espalda', points: ['31.0 38.7 28.0 48.9 28.5 55.3 34.0 75.3 47.2 71.0 47.2 66.3 36.5 54.0 33.6 41.2', '68.9 38.7 71.9 49.3 71.4 56.1 65.9 75.3 52.7 71.0 52.7 66.3 63.4 54.4 66.3 41.7'] },
    { id: 'Tríceps', points: ['26.8 49.7 17.8 55.7 14.4 72.3 16.5 81.7 21.7 63.8 26.8 55.7', '73.6 50.2 82.1 55.7 85.9 73.1 83.4 82.1 77.8 62.9 73.1 55.7', '26.8 58.2 26.8 68.5 22.9 75.3 19.1 77.4 22.5 65.5', '72.7 58.2 77.0 64.6 80.4 77.4 76.5 75.3 72.7 68.9'] },
    { id: 'Espalda', points: ['47.6 72.7 34.4 77.0 35.3 83.4 49.3 102.1 46.8 82.9', '52.3 72.7 65.5 77.0 64.6 83.4 50.6 102.1 53.1 83.8'] }, // Lower back
    { id: 'Antebrazos', points: ['86.3 75.7 91.0 83.4 93.1 94.0 100 106.3 96.1 104.2 88.0 89.3 84.2 83.8', '13.6 75.7 8.9 83.8 6.8 93.6 0 106.3 3.8 104.2 12.3 88.5 15.7 82.9', '81.2 79.5 77.4 77.8 79.1 84.6 91.0 103.8 93.1 108.9 94.4 104.6', '18.7 79.5 22.1 77.8 20.8 84.2 9.3 102.9 6.8 108.5 5.1 104.6'] },
    { id: 'Glúteos', points: ['44.6 99.5 30.2 108.5 29.7 118.7 31.4 125.9 47.2 121.2 49.3 114.8', '55.3 99.1 51.0 114.4 52.3 120.8 68.0 125.9 69.7 119.1 69.3 108.5'] },
    { id: 'Femoral', points: ['28.9 122.1 31.0 129.3 36.5 125.9 35.3 135.3 34.4 150.2 29.3 158.2 28.9 146.8 27.6 141.2 27.2 131.4', '71.4 121.7 69.3 128.9 63.8 125.9 65.5 136.5 66.3 150.2 71.0 158.2 71.4 147.6 72.7 142.1 73.6 131.9', '38.7 125.5 44.2 145.9 40.4 166.8 36.1 152.7 37.0 135.3', '61.7 125.5 63.4 136.1 64.2 153.1 60 166.8 56.1 146.3'] },
    { id: 'Gemelos', points: ['29.3 160.4 28.5 167.2 24.6 179.5 23.8 192.7 25.5 197.0 28.5 193.1 29.7 180 31.9 171.0 31.9 166.8', '37.4 165.1 35.3 167.6 33.1 171.9 31.0 180.4 30.2 191.9 34.0 200 38.7 190.6 39.1 168.9', '62.9 165.1 61.2 168.5 61.7 190.6 66.3 199.5 70.6 191.9 68.9 179.5 66.8 170.2', '70.6 160.4 72.3 168.5 75.7 179.1 76.5 192.7 74.4 196.5 72.3 193.6 70.6 179.5 68.0 168.0'] }
  ];

  const silhouetteColor = isDark ? "#222" : "#e0e0e0";
  const bodyBaseColor = isDark ? "#121212" : "#f5f5f5";

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        backgroundColor: isDark ? '#080808' : '#fff', 
        padding: '30px', 
        borderRadius: '32px', 
        flexShrink: 0,
        boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.05)',
        border: `1px solid ${isDark ? '#222' : '#eee'}`,
        margin: isMobile ? '0 auto' : '0'
      }}>
        {/* VISTA FRONTAL */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: isDark ? '#555' : '#aaa', marginBottom: '15px', fontWeight: '900', letterSpacing: '2px' }}>FRONTAL</div>
          <svg width={isMobile ? "150" : "200"} height={isMobile ? "300" : "400"} viewBox="0 0 100 200">
            {FRONT_DATA.map((muscle) => {
              const intensity = muscle.decorative ? 0 : getIntensity(muscle.id);
              const color = muscle.decorative ? silhouetteColor : (intensity === 0 ? bodyBaseColor : getColor(intensity));
              return muscle.points.map((p, i) => (
                <polygon 
                  key={`${muscle.id}-${i}`} 
                  points={p} 
                  fill={color} 
                  stroke={isDark ? "#000" : "#fff"} 
                  strokeWidth="0.2"
                  style={{ transition: 'fill 0.4s ease' }} 
                />
              ));
            })}
          </svg>
        </div>

        {/* VISTA POSTERIOR */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: isDark ? '#555' : '#aaa', marginBottom: '15px', fontWeight: '900', letterSpacing: '2px' }}>POSTERIOR</div>
          <svg width={isMobile ? "150" : "200"} height={isMobile ? "300" : "400"} viewBox="0 0 100 200">
            {BACK_DATA.map((muscle) => {
              const intensity = muscle.decorative ? 0 : getIntensity(muscle.id);
              const color = muscle.decorative ? silhouetteColor : (intensity === 0 ? bodyBaseColor : getColor(intensity));
              return muscle.points.map((p, i) => (
                <polygon 
                  key={`${muscle.id}-${i}`} 
                  points={p} 
                  fill={color} 
                  stroke={isDark ? "#000" : "#fff"} 
                  strokeWidth="0.2"
                  style={{ transition: 'fill 0.4s ease' }} 
                />
              ));
            })}
          </svg>
        </div>
      </div>
      
      <div style={{ flex: 1, width: '100%', maxWidth: '500px' }}>
        <div style={{ marginBottom: '25px', textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ fontSize: '0.75rem', color: isDark ? '#555' : '#999', marginBottom: '12px', fontWeight: '900', letterSpacing: '1px' }}>INTENSIDAD DE ENTRENAMIENTO (7 DÍAS)</div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4].map(lvl => (
              <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#111' : '#f8f8f8', padding: '6px 12px', borderRadius: '10px', border: `1px solid ${isDark ? '#222' : '#eee'}` }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: getColor(lvl), boxShadow: lvl > 0 ? `0 0 10px ${getColor(lvl)}44` : 'none' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isDark ? '#999' : '#666' }}>Nivel {lvl}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {Object.entries(counts).sort((a,b) => (t(a[0]) || a[0]).localeCompare(t(b[0]) || b[0])).map(([m, val]) => (
            <div key={m} style={{ 
              display: 'flex', flexDirection: 'column', padding: '15px', 
              backgroundColor: isDark ? '#111' : '#fff', borderRadius: '16px', 
              border: `1px solid ${isDark ? '#222' : '#eee'}`,
              borderBottom: `4px solid ${getColor(getIntensity(val))}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s ease'
            }}>
              <span style={{ fontSize: '0.75rem', color: isDark ? '#666' : '#999', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>{t(m) || m}</span>
              <span style={{ fontSize: '1.2rem', color: isDark ? '#fff' : '#000', fontWeight: '900' }}>{val} <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#1dd1a1' }}>SERIES</span></span>
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