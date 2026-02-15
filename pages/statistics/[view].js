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
    Oblicuos: ['Oblicuos', 'Obliques']
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
      if (ratio <= 0.33) return 1;
      if (ratio <= 0.66) return 2;
      return 3;
    };

    const getColor = (intensity) => {
      if (intensity === 0) return isDark ? '#2a2a2a' : '#eeeeee';
      if (intensity === 1) return 'rgba(29, 209, 161, 0.4)';
      if (intensity === 2) return 'rgba(29, 209, 161, 0.7)';
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
  const [manualLevels, setManualLevels] = useState({});

  const handleMuscleClick = (id) => {
    const currentLevel = manualLevels[id] !== undefined ? manualLevels[id] : getIntensity(counts[id] || 0);
    const nextLevel = (currentLevel + 1) % 4;
    setManualLevels(prev => ({ ...prev, [id]: nextLevel }));
  };

  // Paths mejorados y más completos
  const FRONT_PATHS = {
    Pecho: [
      "M30.86 41.39c-2.14 0-4.28.14-6.42.42-2.14.28-4.28.7-6.42 1.26-2.14.56-4.28 1.26-6.42 2.1-2.14.84-4.28 1.82-6.42 2.94-2.14 1.12-4.28 2.38-6.42 3.78-2.14 1.4-4.28 2.94-6.42 4.62-2.14 1.68-4.28 3.5-6.42 5.46-2.14 1.96-4.28 4.06-6.42 6.3-2.14 2.24-4.28 4.62-6.42 7.14-2.14 2.52-4.28 5.18-6.42 7.98-2.14 2.8-4.28 5.74-6.42 8.82-2.14 3.08-4.28 6.3-6.42 9.66-2.14 3.36-4.28 6.86-6.42 10.5-2.14 3.64-4.28 7.42-6.42 11.34-2.14 3.92-4.28 7.98-6.42 12.18-2.14 4.2-4.28 8.54-6.42 13.02-2.14 4.48-4.28 9.1-6.42 13.86-2.14 4.76-4.28 9.66-6.42 14.7-2.14 5.04-4.28 10.22-6.42 15.54-2.14 5.32-4.28 10.78-6.42 16.38-2.14 5.6-4.28 11.34-6.42 17.22-2.14 5.88-4.28 11.9-6.42 18.06-2.14 6.16-4.28 12.46-6.42 18.9-2.14 6.44-4.28 13.02-6.42 19.74-2.14 6.72-4.28 13.58-6.42 20.58-2.14 7-4.28 14.14-6.42 21.42z",
      "M272.91 422.84c-18.95-17.19-22-57-12.64-78.79 5.57-12.99 26.54-24.37 39.97-25.87q20.36-2.26 37.02.75c9.74 1.76 16.13 15.64 18.41 25.04 3.99 16.48 3.23 31.38 1.67 48.06q-1.35 14.35-2.05 16.89c-6.52 23.5-38.08 29.23-58.28 24.53-9.12-2.12-17.24-4.38-24.1-10.61z",
      "M416.04 435c-15.12.11-34.46-6.78-41.37-21.48q-1.88-3.99-2.84-12.18c-2.89-24.41-5.9-53.65 8.44-74.79 4.26-6.26 10.49-7.93 18.36-8.56q11.66-.92 23.32-.35c10.58.53 18.02 2.74 26.62 7.87 12.81 7.65 19.73 14.52 22.67 29.75 4.94 25.57.24 64.14-28.21 74.97q-12.26 4.67-26.99 4.77z"
    ],
    Abdomen: [
      "M438.7 444.36c-2.09-4.03-.13-6.83 3.63-8.81 10.22-5.36 16.79-11 24.23-18.07a1.71 1.71 0 012.89 1.12c.33 4.74-.81 14.39-5.53 17.22-4.68 2.82-18.74 10.02-24.39 9.14q-.57-.09-.83-.6z",
      "M457.39 466.73c-3.72-1.02-13.2-10.29-16.5-14.49a.52.52 0 01.24-.81q10.94-3.75 21.31-9c3.96-2.01 6.3-5.98 8.57-9.58q.38-.59.55.09c.82 3.33 1.54 6.17.38 9.58-2.55 7.44-7.62 18.79-13.66 24.01a.96.96 0 01-.89.2z",
      "M428.43 487.22c-1.01-1.79-.82-4.55-.71-6.72q.78-15.08.48-30.27-.01-.59.55-.4 1.72.59 3.02 1.64 11.58 9.37 18.82 16.95c3.86 4.05-16.2 17.42-19.56 19.48a1.87 1.86 59.6 01-2.6-.68z",
      "M470.76 456.28a.25.25 0 01.44.13q2.03 19.67-9.8 35.22-.37.48-.6-.08c-1.37-3.29-5.86-16.13-3.51-18.91q6.3-7.47 13.47-16.36z",
      "M452.27 478.5c1.13.49 4.28 12.47 4.78 14.38q.14.5-.23.88-1.29 1.35-2.65 2.41-10.44 8.12-21.76 14.97-1.49.9-2.91 1.33a.81.81 0 01-1.05-.71q-.73-8.62.67-17.15.08-.47.44-.8c1.74-1.6 21.96-15.73 22.34-15.51a.58.03 31 00.37.2z",
      "M428.22 519.14q.11-.36.43-.56 15.3-9.66 28.83-21.69a.43.42-22.6 01.71.29c.51 8.26 2.25 18.67-4.46 25.4q-11.8 11.84-25.03 22.09-.43.34-.49-.2c-.75-6.82-1.97-18.92.01-25.33z",
      "M456.54 524.55a.04.04 0 01.07.02q1.52 13.67.41 27.4-.04.47-.28.88c-4.97 8.3-18.23 19.62-27.88 22.63q-.57.17-.58-.43-.05-10.31-.27-20.53-.1-4.8 2.63-7.09c8.54-7.13 18.56-14.62 25.9-22.88z",
      "M418.89 657.11q-1.12-1.67-.43-3.63 3.27-9.38 4.04-18.23 1.97-22.81 3.58-45.65c.16-2.32.72-6.41 2.84-7.71q14.97-9.23 27.16-21.93.41-.42.71.08 1.29 2.15 1.53 4.2 3.23 27.74 3.13 56.8a1.3 1.28-24.5 01-.33.86q-12.74 13.93-25.55 27.75c-4.8 5.17-9.09 7.87-15.73 7.96q-.61.01-.95-.5z"
    ],
    Trapecio: [
      "M34.08 27.04c2.14 0 4.28.14 6.42.42 2.14.28 4.28.7 6.42 1.26 2.14.56 4.28 1.26 6.42 2.1 2.14.84 4.28 1.82 6.42 2.94 2.14 1.12 4.28 2.38 6.42 3.78 2.14 1.4 4.28 2.94 6.42 4.62 2.14 1.68 4.28 3.5 6.42 5.46 2.14 1.96 4.28 4.06 6.42 6.3 2.14 2.24 4.28 4.62 6.42 7.14 2.14 2.52 4.28 5.18 6.42 7.98z"
    ],
    Oblicuos: [
      "M31,63c-1,4 0,9 2,13c1,4 3,8 6,11c1-5 1-11 0-16C36,68 33,66 31,63z",
      "M69,63c1,4 0,9-2,13c-1,4-3,8-6,11c-1-5-1-11 0-16C64,68 67,66 69,63z"
    ],
    Antebrazos: [
      "M8.38 80.65c2.14 0 4.28.14 6.42.42 2.14.28 4.28.7 6.42 1.26 2.14.56 4.28 1.26 6.42 2.1 2.14.84 4.28 1.82 6.42 2.94 2.14 1.12 4.28 2.38 6.42 3.78z"
    ],
    Hombros: [
      "M274.06 311.69q3.94 2.77 4.33 8.14.04.48-.38.73c-9.98 5.88-24.35 7.45-28.82 19.75-2.31 6.36-.97 17.35-1.43 23.68q-.55 7.51-5.73 14.07-10.37 13.11-13.81 16.67c-3.41 3.53-6.81 1.76-10.69-.47-15.42-8.87-24.95-25.45-22.52-43.22 2.05-14.92 12.71-25.79 24.06-35.02 16.99-13.82 35.58-17.99 54.99-4.33z",
      "M450.39 320.75q-.95-.52-.7-1.58c1.57-6.61 5.8-9.1 12.14-11.9 24.99-11.03 43.76 3.33 60.17 20.74 20.73 21.99 11.81 56.44-14.82 68.19-4.41 1.94-6.79-1.03-9.81-4.51-5.81-6.7-13.46-14.12-15.99-22.8-3.93-13.43 4.32-27.54-9.64-37.62q-8.22-5.93-17.99-9.08-1.84-.59-3.36-1.44z"
    ],
    Bíceps: [
      "M189.52 492.51c-2.43.62-7.38.57-7.51-3.08-.56-16.01-.42-35.49 5.11-50.26 3.19-8.54 13.89-30.22 23.27-32.72 10.08-2.68 12.68 16.59 12.6 22.8-.22 15.98-7.51 34.79-15.05 48.71-4.29 7.94-9.95 12.38-18.42 14.55z",
      "M526.69 486.31c-9.9-8.61-17.75-33.21-20.65-47.73-1.41-7.06-1.34-29.61 8.58-32.16 10.33-2.66 23.81 25.34 26.6 32.91q2.6 7.04 3.6 16.13 1.62 14.66 1.66 32.28c.03 11.04-16.45 1.48-19.79-1.43z"
    ],
    Tríceps: [
      "M206.2 514.2c-5.41-.67-6.55-7.29-4.69-11.42 11.08-24.55 22.84-50.62 30.54-75.51 1.37-4.41 3.08-8.59 3.95-12.45q2.94-13.12 5.79-26.26.42-1.98 1.82-3.39a.52.52 0 01.81.1q1.04 1.69 1.94 4.56 4.63 14.65 5.15 24.92c.57 11.36-5.11 24.55-8.65 35.5q-7.69 23.78-20.25 45.39c-2.45 4.23-11.51 19.18-16.41 18.56z"
    ],
    Cuádriceps: [
      "M292.42 935.6q-.95-.52-1.57-1.4-4.1-5.79-7-13.53-7.8-20.79-13.3-42.33c-9.06-35.53-19.33-71.36-25.03-107.59-5.33-33.86 4-74.19 20.7-103.37q.35-.62.53.07c14.44 55.57 39.03 107.94 41.45 165.34 1.11 26.34.66 52.96-3.6 79.03-.63 3.83-4.73 27.81-12.18 23.78z",
      "M275.11 942.93q-2.42-2.18-3.57-5.24c-3.98-10.61-7.68-21.02-12.81-31.32-7.85-15.76-10.77-34.56-13.2-51.46-2.11-14.63-2.31-31.47-3.93-47.18-.22-2.16-1.04-12.78.46-13.79q1.36-.92 2.08.55c1.5 3.08 3.12 6.12 3.66 9.58q8.21 52.38 26.36 102.15c2.87 7.87 9.98 30.5 1.85 36.74a.71.7-42.5 01-.9-.03z",
      "M322.69 945.72c-3.73 6.14-10.77-2.43-12.6-5.6-3.16-5.47-2.62-14.93-1.78-20.81 4.03-28.09 5.6-52.81 3.48-80.78q-.06-.79.28-.08 15.77 32.83 14.26 68.9c-.4 9.54-2.94 22.48-2.91 34.13q.01 3.02-.73 4.24z",
      "M437.82 933.52c-8.9 14.18-15.15-26.74-15.46-29.25q-5.26-43.04-1.19-86.08c4.9-51.8 26.91-99.32 40.38-150.92q.18-.66.5-.06c17.25 31.67 25.39 68.28 20.54 104.36q-2.29 17.02-8.71 42.76-7.56 30.25-15.2 60.47-6.13 24.25-15.06 47.61-1.83 4.79-5.8 11.11z"
    ],
    Femoral: [
      "M280.26 647.4c11.65 10.74 22.18 21.04 31.02 34.3 15.82 23.72 27.55 49.72 34.01 77.58 1.34 5.79-6.14 20.34-12.62 20.22q-.52-.01-.72-.49-.67-1.59-1.21-3.13c-14.68-41.71-27.96-79.71-46.87-117.01-1.9-3.74-3.05-7.33-4.06-11.2a.27.27 0 01.45-.27z"
    ],
    Gemelos: [
      "M252.09 1032.57c.24-3.71 2.14-22.17 4.63-24.18a1.03 1.02-17.9 011.67.85c-.45 7.89-1.27 16-1.49 23.45q-.57 18.93-.66 37.88-.02 3.63.34 6.85c2.08 18.76 5.56 37.32 9.3 55.8 3.82 18.84 9.13 37.64 13.11 56.63q2.44 11.68 2.08 17.95c-.32 5.7-3.08 20.49-8.51 23.92a.62.62 0 01-.84-.16q-1.2-1.65-.95-3.55c.92-7.26 1.45-14.15-.3-21.52q-8.25-34.74-13.62-59.06c-1.86-8.44-3.17-17.18-3.93-26.3q-3.69-44.24-.83-88.56z"
    ]
  };

  const BACK_PATHS = {
    Espalda: [
      "M1071.06 308.94c5.6 4.92 6.96 17.83 7.43 24.88q1.5 22.3.93 44.68-1.2 46.76-5.66 94a.57.56 3.7 01-.59.51q-.68-.03-.94-1.01-4.29-15.9-9.79-25.19c-10.24-17.31-18.8-31.84-25.59-49.4-10.19-26.38-15.6-54.28-26.46-80.58q-3.07-7.43-7.61-14.07-.3-.43.2-.6 12.47-4.28 25.48-4.85c5.54-.25 12.15.86 18.32 1.41 9.7.87 16.77 3.6 24.28 10.22z",
      "M1163.98 302.12a.43.43 0 01.22.65q-7.08 10.77-11.41 23.37c-10.53 30.61-17.8 62.94-31.3 91.07-5.11 10.64-15.17 25.22-20.12 36.26q-4.08 9.08-6.59 18.83a.77.77 0 01-1.51-.12q-4.27-45.15-5.52-90.99c-.56-20.28-.74-39.92 2.75-60.43 1.04-6.13 2.77-9.98 7.85-13.85 9.8-7.48 18.02-7.73 30.1-9.11 12.02-1.39 23.92.4 35.53 4.32z"
    ],
    Tríceps: [
      "M931.03 442.29c-2.01 2.57-6.52 9.71-10.12 9.17q-.52-.08-.8-.52-1.35-2.09-1.84-4.44c-2.25-10.87-3.28-22.88 1.35-33.38 5.45-12.33 18.27-23.68 29.61-31.2a.47.46 68.7 01.71.32l6.42 38.52q.09.54-.26.97c-.47.58-1.12 1.52-1.71 1.94q-9.11 6.58-18.08 13.36-2.9 2.2-5.28 5.26z",
      "M958.15 427.11a.41.41 0 01.55.27q4.44 16.16-2.23 31.41-3.37 7.73-5.91 19.98c-1.51 7.28-8.93 12.21-11.81 18.82-2.42 5.56-2.41 12.5-3.51 16.66-2.14 8.06-8.51 14.15-13.91 20.13a.93.93 0 01-1.54-.25q-.57-1.3-.75-2.89c-1.93-16.91 2.52-33.52 5.71-49.99 2.16-11.21-1.54-24.15 9.68-34.59q9.54-8.86 19.55-17.23c1.3-1.08 2.7-1.72 4.17-2.32z"
    ],
    Hombros: [
      "M980.66 319.58c.19.14.55.19.65.32a.8.8 0 01-.16 1.15c-6.78 4.75-15.26 9.77-20.03 15.58-6.41 7.78-8.76 16.96-9.44 27.04-.39 5.92-1.68 9.5-5.59 13.43-10.02 10.08-19.04 16.47-31.14 20.41q-.75.25-.75-.55.19-18.4-.09-36.3-.14-9.4 1.07-14.22c4.04-16.07 22.8-33.85 39.68-35.64 9.99-1.06 17.34 2.46 25.8 8.78z",
      "M1227.3 316.44c14.62 9.44 25.48 21.03 25.46 39.51q-.02 20.56-.01 41.37a.37.37 0 01-.51.35c-5.08-2.06-10.41-3.98-14.9-6.97-7.84-5.24-21.14-14.95-21.77-24.95-.69-10.75-2.81-20.85-9.76-29.25-4.68-5.65-12.96-10.58-19.6-15.26q-1.23-.87.01-1.71c4.6-3.13 9.91-6.78 15.25-7.98q13.58-3.03 25.83 4.89z"
    ],
    Glúteos: [
      "M1007.94 762.81c-16.94-16.64-29.37-37.66-31.47-61-2.06-22.84 15.63-34.95 32.18-45.71 8.2-5.33 46.51-27.32 54.37-17.65 5.92 7.29 13.38 15.84 15.44 25.21q3.01 13.63 2.44 27.6-.94 22.59-6.27 44.49c-2.43 9.96-2.9 17.16-2.59 26.75.47 14.83-18.52 17.18-29.12 14.07-6.38-1.87-13.79-4.83-21.35-6.25q-7.39-1.38-13.63-7.51z"
    ],
    Femoral: [
      "M963.27 741.53a.71.7 31.7 011.19-.28q1.51 1.62 2.47 3.99c4.6 11.41 8.93 22.66 11.07 34.72 3.38 19.14 4.84 38.23 3.12 57.74q-1.68 19.06-2.99 38.15c-.51 7.55-.88 15.71.07 23.18q1.08 8.54 1.39 17.57a.52.52 0 01-.98.25q-1.03-2.07-1.8-4.62-5.13-16.92-7.25-34.49-5.01-41.45-6.86-83.17-1.09-24.75-.07-49.51.06-1.59.64-3.53z"
    ],
    Gemelos: [
      "M982.69 1149.31c-3.07-2.23-3.98-6.24-5.24-11.03-7.19-27.14-7.88-53.18-6.67-82.78q1.03-25.29 9.23-47.45c4.77-12.89 15.33-24.77 23.79-36q.82-1.09.74.27c-1.37 22.86-2.72 45.67-3.11 68.49-.52 30.56-1.51 61.11-.42 91.68.24 6.83-2.77 16.29-10.08 18.37q-4.39 1.25-8.24-1.55z"
    ]
  };

  const DECORATIVE_PATHS = [
    "M 418.91 167.68 c 3.92 -1.77 6.58 0.47 7.06 4.32 c 1.48 11.93 -4.92 26.67 -11.75 36.45 c -2.21 3.17 -3.86 0.17 -4.74 -1.76 a 0.38 0.38 0 0 0 -0.73 0.16 c 0.02 8.31 1.01 17.01 -3.36 24.53 c -0.167 0.293 -4.39 4.62 -10.799 9.508 c -23.591 18.112 -41.591 16.112 -61.446 -0.797 c -4.736 -3.649 -5.925 -5.041 -8.805 -7.621 c -5.66 -5.07 -5.28 -17.38 -4.47 -24.92 c 0.05 -0.51 -0.468 -0.892 -0.933 -0.687 a 0.653 0.653 0 0 0 -0.357 0.397 c -0.57 1.69 -2.24 4.05 -4.07 1.48 c -6.2 -8.71 -16.02 -28.53 -11.19 -38.98 c 1.68 -3.627 3.733 -3.91 6.16 -0.85 a 182.853 182.853 0 0 1 3.78 23.29 a 1.02 1.02 0 0 0 1.56 0.77 c 2.79 -1.75 2.61 -18.93 2.63 -24.22 c 0.02 -4.53 1.12 -8.94 3.8 -13.1 c 4.36 -6.76 4.86 -11.51 5.57 -19.82 c 0.47 -5.53 4.34 -8.12 9.77 -8.21 c 6.39 -0.12 12.69 -0.07 19 -0.93 c 4.02 -0.55 7.4 -1.43 11.53 -0.75 c 6.7 1.1 13.44 1.64 20.22 1.62 c 4.607 -0.013 7.523 0.227 8.75 0.72 c 5.96 2.37 5.56 9.73 6.11 15.22 c 0.44 4.34 2.097 8.447 4.97 12.32 c 6.57 8.88 2.19 25.6 5.64 36.36 a 1.14 1.14 0 0 0 2.22 -0.23 c 0.887 -8.36 2.18 -16.45 3.88 -24.27 z",
    "M1028.14 166.45c1.03 5.06 1.36 9.61 6.41 11.53 13.06 4.95 16.74 15.51 23.52 27.48 1.387 2.447 3.863 3.623 7.43 3.53a910.025 910.025 0 0136.94-.25c6.23.09 9.27-7.55 11.48-12.3 4.31-9.27 10.37-15.83 20.28-18.94.333-.1.603-.287.81-.56 1.92-2.58 3.043-5.43 3.37-8.55l2.31-1.51a.977.977 0 01.99-.08c11.92 5.42-3.35 35.31-8.21 42.45-.761 1.11-2.423 1.028-3.06-.15l-1.26-2.32c-.133-.253-.32-.297-.56-.13-.34.24-.48.61-.42 1.11.86 7.64.75 16.87-2.96 23.31-.173.3.839.041-3.7 4.71-3.34 3.436-74.18 3.78-75.48-1.38a1.465 1.465 0 00-.55-.82c-4.15-2.97-6.07-7.95-6.16-12.39-.03-1.68.18-14.28-.53-14.63-.207-.1-.33-.037-.37.19-.3 1.553-1.183 2.597-2.65 3.13a.951.951 0 01-1.07-.32c-7.29-9.56-12.32-22.18-12.97-33.54-.34-6.04 1.797-9.23 6.41-9.57z"
  ];

  const silhouetteColor = isDark ? "#222" : "#e0e0e0";

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        backgroundColor: '#000', // Fondo negro para máximo contraste
        padding: '30px', 
        borderRadius: '32px', 
        flexShrink: 0,
        boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
        border: `1px solid ${isDark ? '#222' : '#333'}`,
        margin: isMobile ? '0 auto' : '0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: '15px', fontWeight: '900', letterSpacing: '2px' }}>FRONTAL</div>
          <svg width={isMobile ? "150" : "250"} height={isMobile ? "300" : "500"} viewBox="0 0 600 1300" style={{ background: 'transparent' }}>
            {DECORATIVE_PATHS.map((p, i) => <path key={i} d={p} fill="#111" stroke="#222" strokeWidth="1" />)}
            {Object.entries(FRONT_PATHS).map(([group, paths]) => {
              const intensity = manualLevels[group] !== undefined ? manualLevels[group] : getIntensity(counts[group] || 0);
              const color = getColor(intensity);
              return paths.map((p, i) => (
                <path 
                  key={`${group}-${i}`} 
                  d={p} 
                  fill={color} 
                  stroke="#000" 
                  strokeWidth="0.8" 
                  onClick={() => handleMuscleClick(group)}
                  style={{ transition: 'fill 0.3s ease', cursor: 'pointer' }} 
                />
              ));
            })}
          </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: '15px', fontWeight: '900', letterSpacing: '2px' }}>POSTERIOR</div>
          <svg width={isMobile ? "150" : "250"} height={isMobile ? "300" : "500"} viewBox="700 0 600 1300" style={{ background: 'transparent' }}>
            {DECORATIVE_PATHS.map((p, i) => <path key={i} d={p} fill="#111" stroke="#222" strokeWidth="1" />)}
            {Object.entries(BACK_PATHS).map(([group, paths]) => {
              const intensity = manualLevels[group] !== undefined ? manualLevels[group] : getIntensity(counts[group] || 0);
              const color = getColor(intensity);
              return paths.map((p, i) => (
                <path 
                  key={`${group}-${i}`} 
                  d={p} 
                  fill={color} 
                  stroke="#000" 
                  strokeWidth="0.8" 
                  onClick={() => handleMuscleClick(group)}
                  style={{ transition: 'fill 0.3s ease', cursor: 'pointer' }} 
                />
              ));
            })}
          </svg>
        </div>
      </div>
      
      <div style={{ flex: 1, width: '100%', maxWidth: '500px' }}>
        <div style={{ marginBottom: '25px', textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ fontSize: '0.75rem', color: isDark ? '#555' : '#999', marginBottom: '12px', fontWeight: '900', letterSpacing: '1px' }}>INTENSIDAD DE ENTRENAMIENTO (HAZ CLICK EN LOS MÚSCULOS)</div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3].map(lvl => (
              <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#111' : '#f8f8f8', padding: '6px 12px', borderRadius: '10px', border: `1px solid ${isDark ? '#222' : '#eee'}` }}>
                <div style={{ 
                  width: '14px', 
                  height: '14px', 
                  borderRadius: '4px', 
                  backgroundColor: lvl === 0 ? (isDark ? '#2a2a2a' : '#eeeeee') : getColor(lvl), 
                  boxShadow: lvl > 0 ? `0 0 10px ${getColor(lvl)}` : 'none',
                  border: lvl === 0 ? `1px solid ${isDark ? '#444' : '#ccc'}` : 'none'
                }} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isDark ? '#999' : '#666' }}>Nivel {lvl}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {Object.entries(counts).sort((a,b) => (t(a[0]) || a[0]).localeCompare(t(b[0]) || b[0])).map(([m, val]) => {
            const level = manualLevels[m] !== undefined ? manualLevels[m] : getIntensity(val);
            return (
              <div key={m} 
                onClick={() => handleMuscleClick(m)}
                style={{ 
                  display: 'flex', flexDirection: 'column', padding: '15px', 
                  backgroundColor: isDark ? '#111' : '#fff', borderRadius: '16px', 
                  border: `1px solid ${isDark ? '#222' : '#eee'}`,
                  borderBottom: `4px solid ${getColor(level)}`,
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
