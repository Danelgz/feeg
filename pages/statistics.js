import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { PageHeader, ChipNav } from "../components/ui";
import { computeSeriesByGroup, computeWeeklyStreak } from "../lib/exerciseStats";
import {
  HeroMetricCard,
  WeeklyStreakCard,
  MiniStatCard,
  OverviewSection,
  MuscleMapSection,
  RankMapSection,
  MuscleDetailSection,
  SeriesByGroupSection,
  DistributionChartSection,
  MonthlyReportSection,
  ExerciseStatsSection,
  RecordsSection,
  WeeklyReportSection,
  GoalsAndMilestonesSection,
} from "../components/statistics";

// `usesPeriod` marca las vistas que de verdad reaccionan al filtro de periodo. Las demás miran al
// histórico completo a propósito (un récord sigue vigente aunque se batiera hace un año; el mapa
// muscular es un mapa de calor de los últimos 7 días por diseño). Antes el filtro se mostraba
// siempre, así que en "Récords" el usuario veía unas píldoras de "7 días" que no hacían nada y,
// encima, una fila de totales filtrados a 7 días encima de un contenido histórico. Ahora el filtro
// solo aparece donde tiene efecto.
const VIEWS = [
  { key: 'overview', label: 'Resumen', usesPeriod: true },
  { key: 'records', label: 'Récords', usesPeriod: false },
  { key: 'muscleMap', label: 'Mapa muscular', usesPeriod: false },
  // Los rangos miran al histórico completo por definición: un récord que te subió de rango sigue
  // valiendo aunque lo hicieras hace meses, así que el filtro de periodo no le aplica.
  { key: 'ranks', label: 'Rangos', usesPeriod: false },
  { key: 'seriesByGroup', label: 'Series por grupo', usesPeriod: true },
  { key: 'distChart', label: 'Distribución', usesPeriod: true },
  { key: 'weekly', label: 'Semanal', usesPeriod: false },
  { key: 'monthly', label: 'Mensual', usesPeriod: false },
  { key: 'exerciseStats', label: 'Ejercicios', usesPeriod: false },
];

const PERIOD_OPTIONS = [
  { key: '7days', label: '7 días', days: 7 },
  { key: '30days', label: '30 días', days: 30 },
  { key: '90days', label: '90 días', days: 90 },
  { key: 'all', label: 'Todo', days: null },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Suma de volumen de una lista de entrenos, para comparar periodos entre sí. */
function sumVolume(list) {
  return list.reduce((total, w) => total + Number(w.totalVolume || 0), 0);
}

export default function Statistics() {
  const { t, theme, isMobile, language, completedWorkouts: workouts, user, trainingGoals, saveTrainingGoal, deleteTrainingGoal } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  const [activeView, setActiveView] = useState('overview');
  const [isNarrow, setIsNarrow] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [selectedMuscle, setSelectedMuscle] = useState(null);

  const currentView = VIEWS.find((v) => v.key === activeView) || VIEWS[0];
  const period = PERIOD_OPTIONS.find((p) => p.key === selectedPeriod) || PERIOD_OPTIONS[0];

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
    if (!period.days) return workouts.filter((w) => w.completedAt);
    const cutoff = Date.now() - period.days * DAY_MS;
    return workouts.filter((w) => w.completedAt && new Date(w.completedAt).getTime() >= cutoff);
  }, [workouts, period.days]);

  // Ventana inmediatamente anterior, del mismo tamaño, para la variación del número protagonista.
  // Es el dato que responde a "¿voy mejor o peor?", que ocho totales sueltos no responden.
  const previousVolume = useMemo(() => {
    if (!workouts || !period.days) return null;
    const end = Date.now() - period.days * DAY_MS;
    const start = end - period.days * DAY_MS;
    const previous = workouts.filter((w) => {
      if (!w.completedAt) return false;
      const ts = new Date(w.completedAt).getTime();
      return ts >= start && ts < end;
    });
    return previous.length > 0 ? sumVolume(previous) : null;
  }, [workouts, period.days]);

  const stats = useMemo(() => {
    const aggregate = filteredWorkouts.reduce(
      (acc, w) => {
        acc.totalSeries += Number(w.series || 0);
        acc.totalReps += Number(w.totalReps || 0);
        acc.totalVolume += Number(w.totalVolume || 0);
        acc.totalTimeMin += w.elapsedTime !== undefined
          ? Math.round(Number(w.elapsedTime || 0) / 60)
          : Number(w.totalTime || 0);
        return acc;
      },
      { totalSeries: 0, totalReps: 0, totalVolume: 0, totalTimeMin: 0 }
    );

    const dayCounts = {};
    filteredWorkouts.forEach((w) => {
      const day = new Date(w.completedAt).toLocaleDateString('es-ES', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const sessions = filteredWorkouts.length;
    return {
      ...aggregate,
      sessions,
      bestDay,
      avgVolume: sessions > 0 ? Math.round(aggregate.totalVolume / sessions) : 0,
      avgTimeMin: sessions > 0 ? Math.round(aggregate.totalTimeMin / sessions) : 0,
    };
  }, [filteredWorkouts]);

  // Sobre TODO el histórico, no sobre el periodo: una racha que baja porque has tocado un filtro no
  // es una métrica, es un bug de percepción.
  const weeklyStreak = useMemo(() => computeWeeklyStreak(workouts || []), [workouts]);

  const seriesByGroup = useMemo(() => computeSeriesByGroup(filteredWorkouts), [filteredWorkouts]);

  const deltaPct = useMemo(() => {
    if (previousVolume === null || previousVolume === 0) return null;
    return ((stats.totalVolume - previousVolume) / previousVolume) * 100;
  }, [stats.totalVolume, previousVolume]);

  return (
    <Layout>
      <PageHeader
        isDark={isDark}
        isMobile={isNarrow}
        title={t("statistics")}
        subtitle="Analiza tu progreso y mejora tu entrenamiento con datos detallados"
      />

      <ChipNav
        items={VIEWS}
        activeKey={activeView}
        onChange={changeView}
        isDark={isDark}
        wrap={isNarrow}
        ariaLabel="Vistas de estadísticas"
      />

      {currentView.usesPeriod && (
        <div style={{ marginTop: tk.space.sm, marginBottom: tk.space.lg }}>
          <ChipNav
            items={PERIOD_OPTIONS}
            activeKey={selectedPeriod}
            onChange={setSelectedPeriod}
            isDark={isDark}
            size="sm"
            wrap={isNarrow}
            ariaLabel="Periodo"
          />
        </div>
      )}

      {/* `mode="wait"` para que la vista saliente termine antes de que entre la nueva: solapándolas,
          dos secciones de alturas distintas conviven un instante y la página da un tirón. La clave
          incluye el músculo seleccionado porque entrar al detalle de un grupo y volver al mapa es,
          para el usuario, el mismo tipo de cambio que saltar de pestaña. */}
      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`${activeView}:${selectedMuscle || ''}`}
        role="tabpanel"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: tk.motion.duration.fast, ease: tk.motion.ease.standard }}
        style={{ marginTop: currentView.usesPeriod ? 0 : tk.space.lg }}
      >
        {/* Los totales solo acompañan al Resumen. En las demás vistas eran ruido repetido siete
            veces por encima de un contenido que ya trae sus propios números. */}
        {activeView === 'overview' && (
          <>
            <HeroMetricCard
              isDark={isDark}
              isMobile={isNarrow}
              label={`Volumen levantado · ${period.label.toLowerCase()}`}
              value={Math.round(stats.totalVolume).toLocaleString('es-ES')}
              unit="kg"
              deltaPct={deltaPct}
              deltaLabel={period.days ? `vs ${period.days} días antes` : undefined}
              footer={[
                { label: "Entrenos", value: stats.sessions },
                { label: "Series", value: stats.totalSeries.toLocaleString('es-ES') },
                { label: "Repeticiones", value: stats.totalReps.toLocaleString('es-ES') },
              ]}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: tk.space.md,
                marginBottom: tk.space.xxl,
              }}
            >
              <WeeklyStreakCard streak={weeklyStreak} isDark={isDark} />
              <MiniStatCard label="Tiempo medio" value={`${stats.avgTimeMin} min`} isDark={isDark} />
              <MiniStatCard label="Volumen medio" value={`${stats.avgVolume.toLocaleString('es-ES')} kg`} isDark={isDark} />
              <MiniStatCard label="Mejor día" value={stats.bestDay || '—'} isDark={isDark} />
            </div>

            {/* `isNarrow` y no el `isMobile` del contexto: el resto de la página (PageHeader,
                HeroMetricCard, la rejilla de mini-tarjetas) decide su layout con `isNarrow`, así que
                mezclar las dos señales hacía que esta sección cambiara de 4 a 2 columnas en un ancho
                distinto al de la rejilla que tiene justo encima. */}
            <OverviewSection isDark={isDark} isMobile={isNarrow} workouts={filteredWorkouts} t={t} stats={stats} />
            <GoalsAndMilestonesSection
              isDark={isDark}
              isMobile={isNarrow}
              workouts={workouts || []}
              goals={trainingGoals || []}
              saveTrainingGoal={saveTrainingGoal}
              deleteTrainingGoal={deleteTrainingGoal}
            />
          </>
        )}

        {activeView === 'records' && (
          <RecordsSection isDark={isDark} isMobile={isNarrow} workouts={workouts} t={t} language={language} />
        )}

        {activeView === 'muscleMap' && (
          selectedMuscle ? (
            <MuscleDetailSection
              isDark={isDark}
              isMobile={isNarrow}
              group={selectedMuscle}
              workouts={workouts}
              t={t}
              language={language}
              onBack={() => setSelectedMuscle(null)}
            />
          ) : (
            <MuscleMapSection
              isDark={isDark}
              isMobile={isNarrow}
              workouts={workouts}
              t={t}
              sex={user?.sex ?? null}
              faceStyleId={user?.faceStyle}
              onSelectMuscle={setSelectedMuscle}
            />
          )
        )}

        {/* Rangos no entra en MuscleDetailSection como hace el mapa muscular: su lista despliega los
            ejercicios de cada grupo en el sitio, sin salir de la vista ni pagar el viaje de ida y
            vuelta con un "Volver al mapa". */}
        {activeView === 'ranks' && (
          <RankMapSection isDark={isDark} isMobile={isNarrow} t={t} language={language} />
        )}

        {activeView === 'seriesByGroup' && (
          <SeriesByGroupSection isDark={isDark} isMobile={isNarrow} seriesByGroup={seriesByGroup} t={t} />
        )}

        {activeView === 'distChart' && (
          <DistributionChartSection isDark={isDark} isMobile={isNarrow} seriesByGroup={seriesByGroup} t={t} />
        )}

        {activeView === 'weekly' && (
          <WeeklyReportSection isDark={isDark} isMobile={isNarrow} workouts={workouts || []} t={t} />
        )}

        {activeView === 'monthly' && (
          <MonthlyReportSection isDark={isDark} isMobile={isNarrow} workouts={workouts} t={t} />
        )}

        {activeView === 'exerciseStats' && (
          <ExerciseStatsSection isDark={isDark} isMobile={isNarrow} workouts={workouts} t={t} language={language} />
        )}
      </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
