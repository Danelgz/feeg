import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import Link from "next/link";

export default function Statistics() {
  const { t, theme, isMobile, completedWorkouts: workouts } = useUser();
  const isDark = theme === 'dark';
  const [activeView, setActiveView] = useState('overview');
  const [isNarrow, setIsNarrow] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all'); // all, week, month, year
  const [selectedPeriod, setSelectedPeriod] = useState('7days'); // 7days, 30days, 90days, all

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
    Oblicuos: ['Oblicuos', 'Obliques']
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
    Abdomen: '🎯',
    Antebrazos: '💪',
    Oblicuos: '🎯'
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

  const stats = useMemo(() => {
    if (!filteredWorkouts || filteredWorkouts.length === 0) {
      return {
        sessions: 0,
        totalSeries: 0,
        totalReps: 0,
        totalVolume: 0,
        totalTimeMin: 0,
        lastDate: null,
        avgVolume: 0,
        avgReps: 0,
        bestDay: null,
        streak: 0
      };
    }
    const sorted = [...filteredWorkouts].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    const aggregate = filteredWorkouts.reduce((acc, w) => {
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

    // Calculate streak
    const dates = filteredWorkouts.map(w => new Date(w.completedAt).toDateString()).reverse();
    let streak = 0;
    let currentStreak = 0;
    let prevDate = null;
    dates.forEach(date => {
      if (!prevDate) {
        currentStreak = 1;
      } else {
        const prev = new Date(prevDate);
        const curr = new Date(date);
        const diffDays = Math.floor((curr - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      streak = Math.max(streak, currentStreak);
      prevDate = date;
    });

    // Find best day
    const dayCounts = {};
    filteredWorkouts.forEach(w => {
      const day = new Date(w.completedAt).toLocaleDateString('es-ES', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      sessions: filteredWorkouts.length,
      totalSeries: aggregate.totalSeries,
      totalReps: aggregate.totalReps,
      totalVolume: aggregate.totalVolume,
      totalTimeMin: aggregate.totalTimeMin,
      lastDate: sorted[0]?.completedAt || null,
      avgVolume: filteredWorkouts.length > 0 ? Math.round(aggregate.totalVolume / filteredWorkouts.length) : 0,
      avgReps: filteredWorkouts.length > 0 ? Math.round(aggregate.totalReps / filteredWorkouts.length) : 0,
      bestDay,
      streak
    };
  }, [filteredWorkouts]);

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

  const navButtons = [
    { key: 'overview', label: '📊 Resumen', icon: '📊', description: 'Visión general de tu progreso' },
    { key: 'seriesByGroup', label: '💪 Series por grupo', icon: '💪', description: 'Distribución de series por músculo' },
    { key: 'distChart', label: '📈 Distribución', icon: '📈', description: 'Gráfico de distribución muscular' },
    { key: 'monthly', label: '📅 Mensual', icon: '📅', description: 'Informe detallado por mes' },
    { key: 'exerciseStats', label: '🏋️ Ejercicios', icon: '🏋️', description: 'Estadísticas por ejercicio' }
  ];

  return (
    <Layout>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: isNarrow ? "1.8rem" : "2.5rem", marginBottom: "0.5rem", color: isDark ? "#fff" : "#333", fontWeight: "bold" }}>
          📊 {t("statistics")}
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
        {navButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setActiveView(btn.key)}
            style={{
              padding: '16px',
              backgroundColor: activeView === btn.key ? 'rgba(29, 209, 161, 0.1)' : (isDark ? '#1a1a1a' : '#fff'),
              border: `2px solid ${activeView === btn.key ? '#1dd1a1' : (isDark ? '#333' : '#ddd')}`,
              borderRadius: '16px',
              color: isDark ? '#fff' : '#333',
              textAlign: 'left',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              if (activeView !== btn.key) {
                e.currentTarget.style.borderColor = '#1dd1a1';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeView !== btn.key) {
                e.currentTarget.style.borderColor = isDark ? '#333' : '#ddd';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{btn.icon}</div>
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '4px' }}>{btn.label}</div>
            <div style={{ fontSize: '0.75rem', color: isDark ? '#888' : '#666' }}>{btn.description}</div>
          </button>
        ))}
      </div>

      {/* Stats Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <EnhancedStatCard 
          label="Entrenamientos" 
          value={stats.sessions} 
          icon="🏋️" 
          isDark={isDark} 
          trend="+12%"
        />
        <EnhancedStatCard 
          label="Series Totales" 
          value={stats.totalSeries} 
          icon="💪" 
          isDark={isDark} 
          trend="+8%"
        />
        <EnhancedStatCard 
          label="Volumen (kg)" 
          value={stats.totalVolume.toLocaleString()} 
          icon="🏆" 
          isDark={isDark} 
          trend="+15%"
        />
        <EnhancedStatCard 
          label="Racha" 
          value={`${stats.streak} días`} 
          icon="🔥" 
          isDark={isDark} 
          trend="Activa"
        />
      </div>

      {/* Secondary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <MiniStatCard label="Reps Totales" value={stats.totalReps} icon="🎯" isDark={isDark} />
        <MiniStatCard label="Tiempo Promedio" value={`${Math.round(stats.totalTimeMin / Math.max(1, stats.sessions))} min`} icon="⏱️" isDark={isDark} />
        <MiniStatCard label="Volumen Promedio" value={`${stats.avgVolume} kg`} icon="📊" isDark={isDark} />
        <MiniStatCard label="Mejor Día" value={stats.bestDay || 'N/A'} icon="📅" isDark={isDark} />
      </div>

      {activeView === 'overview' && (
        <OverviewSection isDark={isDark} isMobile={isMobile} workouts={filteredWorkouts} t={t} stats={stats} />
      )}
      {activeView === 'seriesByGroup' && (
        <SeriesByGroupSection isDark={isDark} seriesByGroup={seriesByGroup} t={t} muscleIcons={muscleIcons} />
      )}
      {activeView === 'distChart' && (
        <DistributionChartSection isDark={isDark} seriesByGroup={seriesByGroup} t={t} muscleIcons={muscleIcons} />
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

function EnhancedStatCard({ label, value, icon, isDark, trend }) {
  return (
    <div style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
      borderRadius: '16px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        position: 'absolute',
        top: '-10px',
        right: '-10px',
        fontSize: '4rem',
        opacity: 0.05,
        color: '#1dd1a1'
      }}>
        {icon}
      </div>
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '0.75rem', color: isDark ? '#888' : '#666', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#1dd1a1', fontWeight: '600' }}>{trend}</div>
    </div>
  );
}

function MiniStatCard({ label, value, icon, isDark }) {
  return (
    <div style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{ fontSize: '1.5rem' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.7rem', color: isDark ? '#888' : '#666', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333' }}>{value}</div>
      </div>
    </div>
  );
}

function OverviewSection({ isDark, isMobile, workouts, t, stats }) {
  const items = workouts
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 8);
  
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "a";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mes";
    interval = seconds / 604800;
    if (interval > 1) return Math.floor(interval) + "sem.";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
      gap: '20px'
    }}>
      <section style={{
        backgroundColor: isDark ? '#1a1a1a' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>📋 Entrenamientos Recientes</h2>
          <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{items.length} registros</span>
        </div>
        {workouts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏋️</div>
            <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>{t('stats_no_data')}</p>
            <p style={{ color: isDark ? '#888' : '#999', fontSize: '0.85rem', marginTop: '8px' }}>Comienza tu entrenamiento para ver estadísticas</p>
          </div>
        ) : (
          <div style={{ maxHeight: '500px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingRight: '8px' }}>
            {items.map((w, index) => (
              <div key={w.id} style={{
                backgroundColor: isDark ? '#0f0f0f' : '#f9f9f9',
                border: isDark ? '1px solid #2a2a2a' : '1px solid #eee',
                borderRadius: '12px',
                padding: isMobile ? '14px' : '16px',
                marginBottom: '12px',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
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
                    <strong style={{ color: isDark ? '#fff' : '#333', fontSize: '1rem' }}>{w.name}</strong>
                  </div>
                  <span style={{ color: isDark ? '#888' : '#666', fontSize: '0.8rem', backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0', padding: '4px 10px', borderRadius: '12px' }}>
                    {getTimeAgo(w.completedAt)}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
                  <MiniStat label="Ejercicios" value={w.exercises} isDark={isDark} />
                  <MiniStat label="Series" value={w.series} isDark={isDark} />
                  <MiniStat label="Reps" value={w.totalReps} isDark={isDark} />
                  <MiniStat label="Volumen" value={(w.totalVolume || 0).toLocaleString()} isDark={isDark} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{
        backgroundColor: isDark ? '#1a1a1a' : '#fff',
        border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <h2 style={{ margin: 0, marginBottom: '20px', color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>🎯 Logros</h2>
        <div style={{ display: 'grid', gap: '16px' }}>
          <AchievementCard 
            icon="🔥" 
            title="Racha Actual" 
            value={`${stats.streak} días`} 
            description="¡Sigue así!" 
            isDark={isDark} 
          />
          <AchievementCard 
            icon="💪" 
            title="Volumen Total" 
            value={`${stats.totalVolume.toLocaleString()} kg`} 
            description="Peso levantado" 
            isDark={isDark} 
          />
          <AchievementCard 
            icon="⏱️" 
            title="Tiempo Entrenado" 
            value={`${stats.totalTimeMin} min`} 
            description="En el gimnasio" 
            isDark={isDark} 
          />
          <AchievementCard 
            icon="📈" 
            title="Mejor Día" 
            value={stats.bestDay || 'N/A'} 
            description="Día más activo" 
            isDark={isDark} 
          />
        </div>
      </section>
    </div>
  );
}

function AchievementCard({ icon, title, value, description, isDark }) {
  return (
    <div style={{
      backgroundColor: isDark ? '#0f0f0f' : '#f9f9f9',
      border: isDark ? '1px solid #2a2a2a' : '1px solid #eee',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{ fontSize: '2rem' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.75rem', color: isDark ? '#888' : '#666', textTransform: 'uppercase', marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isDark ? '#fff' : '#333', marginBottom: '2px' }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: '#1dd1a1' }}>{description}</div>
      </div>
    </div>
  );
}

function SeriesByGroupSection({ isDark, seriesByGroup, t, muscleIcons }) {
  const entries = Object.entries(seriesByGroup).sort((a, b) => b[1] - a[1]);
  const maxVal = entries[0]?.[1] || 1;
  const [tooltip, setTooltip] = useState(null);

  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '16px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>💪 Series por Grupo Muscular</h2>
        <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{entries.filter(([_, n]) => n > 0).length} grupos activos</span>
      </div>
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💪</div>
          <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '1rem' }}>{t('stats_no_data')}</p>
        </div>
      ) : (
        <div>
          {entries.map(([g, n]) => (
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
              <div
                style={{ flex: 1, height: '20px', background: isDark ? '#0f0f0f' : '#eee', borderRadius: '999px', overflow: 'visible', position: 'relative', cursor: 'pointer' }}
                onMouseEnter={(e) => setTooltip({ g, n, x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={(e) => { const t2 = e.touches[0]; setTooltip({ g, n, x: t2.clientX, y: t2.clientY }); }}
                onTouchEnd={() => setTimeout(() => setTooltip(null), 900)}
              >
                <div style={{
                  width: `${n === 0 ? 2 : Math.min(100, (n / maxVal) * 100)}%`,
                  height: '100%',
                  background: n > 0 ? 'linear-gradient(90deg, #1dd1a1, #19b088)' : (isDark ? '#333' : '#ddd'),
                  borderRadius: '999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <div style={{ width: '50px', textAlign: 'right', color: isDark ? '#fff' : '#333', fontWeight: 'bold', fontSize: '0.95rem' }}>{n}</div>
            </div>
          ))}

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: 'fixed',
              left: tooltip.x + 12,
              top: tooltip.y - 36,
              backgroundColor: isDark ? '#1a1a1a' : '#333',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '600',
              pointerEvents: 'none',
              zIndex: 9999,
              border: '1px solid #1dd1a1',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              {muscleIcons?.[tooltip.g] || '💪'} {t(tooltip.g) || tooltip.g}: <span style={{ color: '#1dd1a1' }}>{tooltip.n} series</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DistributionChartSection({ isDark, seriesByGroup, t, muscleIcons }) {
  const total = Object.values(seriesByGroup).reduce((a, b) => a + b, 0) || 1;
  const [tooltip, setTooltip] = useState(null);

  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '16px',
      padding: '24px',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>📈 Distribución Muscular</h2>
        <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{total} series totales</span>
      </div>
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
            <div
              style={{ flex: 1, height: '20px', background: isDark ? '#0f0f0f' : '#eee', borderRadius: '999px', overflow: 'visible', position: 'relative', cursor: 'pointer' }}
              onMouseEnter={(e) => setTooltip({ g, n, pct: Math.round((n / total) * 100), x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
              onMouseLeave={() => setTooltip(null)}
              onTouchStart={(e) => { const t2 = e.touches[0]; setTooltip({ g, n, pct: Math.round((n / total) * 100), x: t2.clientX, y: t2.clientY }); }}
              onTouchEnd={() => setTimeout(() => setTooltip(null), 900)}
            >
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

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 36,
          backgroundColor: isDark ? '#1a1a1a' : '#333',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '10px',
          fontSize: '0.9rem',
          fontWeight: '600',
          pointerEvents: 'none',
          zIndex: 9999,
          border: '1px solid #1dd1a1',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {muscleIcons?.[tooltip.g] || '💪'} {t(tooltip.g) || tooltip.g}: <span style={{ color: '#1dd1a1' }}>{tooltip.pct}% ({tooltip.n} series)</span>
        </div>
      )}
    </section>
  );
}

function WeeklyBodyMapSection({ isDark, workouts, t }) {
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
    Oblicuos: ['Oblicuos', 'Obliques'],
    Trapecio: ['Trapecio', 'Trapezius'],
    Cuello: ['Cuello', 'Neck'],
    Cabeza: ['Cabeza', 'Head']
  };

  const muscleSeriesCount = {};
  Object.keys(groupMap).forEach(g => muscleSeriesCount[g] = 0);

  workouts.forEach(w => {
    if (Array.isArray(w.details)) {
      w.details.forEach(d => {
        const grp = d.muscleGroup || d.group || d.category;
        const found = Object.keys(groupMap).find(key => groupMap[key].includes(grp));
        if (found) muscleSeriesCount[found] += Number(d.series || 0);
      });
    }
    if (!Array.isArray(w.details) && w.seriesByGroup) {
      Object.entries(w.seriesByGroup).forEach(([k, v]) => {
        const found = Object.keys(groupMap).find(key => groupMap[key].includes(k) || key === k);
        if (found) muscleSeriesCount[found] += Number(v || 0);
      });
    }
  });

  return (
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '16px'
    }}>
      <h2 style={{ margin: 0, marginBottom: '12px', color: isDark ? '#fff' : '#333', fontSize: '1.1rem' }}>Distribución de músculos (cuerpo)</h2>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <BodyHeatmap counts={muscleSeriesCount} isDark={isDark} />
      </div>
    </section>
  );
}

function MonthlyReportSection({ isDark, workouts, t }) {
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
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '16px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>📅 Informe Mensual</h2>
        <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{entries.length} meses</span>
      </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
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
    <section style={{
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      border: isDark ? '1px solid #333' : '1px solid #e0e0e0',
      borderRadius: '16px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: isDark ? '#fff' : '#333', fontSize: '1.3rem', fontWeight: 'bold' }}>🏋️ Estadísticas por Ejercicio</h2>
        <span style={{ fontSize: '0.85rem', color: '#1dd1a1', fontWeight: '600' }}>{results.length} ejercicios</span>
      </div>
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Buscar ejercicio..."
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
    </section>
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
