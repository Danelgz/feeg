import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { PageHeader } from "../components/ui";
import { computeSeriesByGroup } from "../lib/exerciseStats";
import {
  EnhancedStatCard,
  MiniStatCard,
  OverviewSection,
  MuscleMapSection,
  MuscleDetailSection,
  SeriesByGroupSection,
  DistributionChartSection,
  MonthlyReportSection,
  ExerciseStatsSection,
} from "../components/statistics";

const NAV_BUTTONS = [
  { key: 'overview', label: 'Resumen', description: 'Visión general de tu progreso' },
  { key: 'muscleMap', label: 'Mapa muscular', description: 'Intensidad por músculo esta semana' },
  { key: 'seriesByGroup', label: 'Series por grupo', description: 'Distribución de series por músculo' },
  { key: 'distChart', label: 'Distribución', description: 'Gráfico de distribución muscular' },
  { key: 'monthly', label: 'Mensual', description: 'Informe detallado por mes' },
  { key: 'exerciseStats', label: 'Ejercicios', description: 'Estadísticas por ejercicio' }
];

const PERIOD_OPTIONS = [
  { key: '7days', label: '7 días' },
  { key: '30days', label: '30 días' },
  { key: '90days', label: '90 días' },
  { key: 'all', label: 'Todo' }
];

export default function Statistics() {
  const { t, theme, isMobile, language, completedWorkouts: workouts } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const [activeView, setActiveView] = useState('overview');
  const [isNarrow, setIsNarrow] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7days'); // 7days, 30days, 90days, all
  const [selectedMuscle, setSelectedMuscle] = useState(null);

  const changeView = (view) => {
    setActiveView(view);
    setSelectedMuscle(null);
  };

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  const seriesByGroup = useMemo(() => computeSeriesByGroup(filteredWorkouts), [filteredWorkouts]);

  return (
    <Layout>
      <PageHeader
        isDark={isDark}
        isMobile={isNarrow}
        title={t("statistics")}
        subtitle="Analiza tu progreso y mejora tu entrenamiento con datos detallados"
      />

      {/* Period Filter */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {PERIOD_OPTIONS.map(period => (
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
        {NAV_BUTTONS.map(btn => (
          <button
            key={btn.key}
            onClick={() => changeView(btn.key)}
            style={{
              padding: '16px',
              backgroundColor: activeView === btn.key ? tk.accentSoft : tk.surface,
              border: `2px solid ${activeView === btn.key ? tk.accent : tk.border}`,
              borderRadius: tk.radius.lg,
              color: tk.text,
              textAlign: 'left',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              if (activeView !== btn.key) {
                e.currentTarget.style.borderColor = tk.accent;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeView !== btn.key) {
                e.currentTarget.style.borderColor = tk.border;
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '4px' }}>{btn.label}</div>
            <div style={{ fontSize: '0.75rem', color: tk.textMuted }}>{btn.description}</div>
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
        <EnhancedStatCard label="Entrenamientos" value={stats.sessions} isDark={isDark} />
        <EnhancedStatCard label="Series Totales" value={stats.totalSeries} isDark={isDark} />
        <EnhancedStatCard label="Volumen (kg)" value={stats.totalVolume.toLocaleString()} isDark={isDark} />
        <EnhancedStatCard label="Racha" value={`${stats.streak} días`} isDark={isDark} />
      </div>

      {/* Secondary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <MiniStatCard label="Reps Totales" value={stats.totalReps} isDark={isDark} />
        <MiniStatCard label="Tiempo Promedio" value={`${Math.round(stats.totalTimeMin / Math.max(1, stats.sessions))} min`} isDark={isDark} />
        <MiniStatCard label="Volumen Promedio" value={`${stats.avgVolume} kg`} isDark={isDark} />
        <MiniStatCard label="Mejor Día" value={stats.bestDay || 'N/A'} isDark={isDark} />
      </div>

      {activeView === 'overview' && (
        <OverviewSection isDark={isDark} isMobile={isMobile} workouts={filteredWorkouts} t={t} stats={stats} />
      )}
      {activeView === 'muscleMap' && (
        // El mapa (y su detalle) siempre miran a los últimos 7 días, independientemente del
        // filtro de periodo de la página — es un mapa de calor semanal por diseño.
        selectedMuscle ? (
          <MuscleDetailSection
            isDark={isDark}
            group={selectedMuscle}
            workouts={workouts}
            t={t}
            language={language}
            onBack={() => setSelectedMuscle(null)}
          />
        ) : (
          <MuscleMapSection isDark={isDark} workouts={workouts} t={t} onSelectMuscle={setSelectedMuscle} />
        )
      )}
      {activeView === 'seriesByGroup' && (
        <SeriesByGroupSection isDark={isDark} seriesByGroup={seriesByGroup} t={t} />
      )}
      {activeView === 'distChart' && (
        <DistributionChartSection isDark={isDark} seriesByGroup={seriesByGroup} t={t} />
      )}
      {activeView === 'monthly' && (
        <MonthlyReportSection isDark={isDark} workouts={workouts} t={t} />
      )}
      {activeView === 'exerciseStats' && (
        <ExerciseStatsSection isDark={isDark} workouts={workouts} t={t} language={language} />
      )}
    </Layout>
  );
}
