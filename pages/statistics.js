import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { PageHeader, ChipNav } from "../components/ui";
import { computeWeeklyStreak, resolveWeeklyGoal } from "../lib/exerciseStats";
import {
  HeroMetricCard,
  MuscleMapSection,
  RankMapSection,
  MuscleDetailSection,
  ExerciseStatsSection,
  RecordsSection,
  GoalsAndMilestonesSection,
} from "../components/statistics";
import ProgressChart from "../components/statistics/ProgressChart";
import ConsistencyHeatmap from "../components/statistics/ConsistencyHeatmap";
import StatStrip from "../components/statistics/StatStrip";
import MuscleBreakdown from "../components/statistics/MuscleBreakdown";

// `usesPeriod` marca las vistas que de verdad reaccionan al filtro de periodo. Las demás miran al
// histórico completo a propósito (un récord sigue vigente aunque se batiera hace un año; el mapa
// muscular es un mapa de calor de los últimos 7 días por diseño). Antes el filtro se mostraba
// siempre, así que en "Récords" el usuario veía unas píldoras de "7 días" que no hacían nada y,
// encima, una fila de totales filtrados a 7 días encima de un contenido histórico. Ahora el filtro
// solo aparece donde tiene efecto.
// Cinco vistas, no nueve. "Series por grupo" y "Distribución" pintaban el mismo dato dos veces y
// el mapa muscular una tercera: ahora son una sola vista, Músculos. "Semanal" y "Mensual" eran
// listas de tarjetas idénticas con cuatro números cada una; ahora son la gráfica de Progreso del
// Resumen, que se lee de un vistazo en vez de comparando cifras de memoria.
const VIEWS = [
  { key: 'overview', label: 'Resumen', usesPeriod: true },
  // El periodo de Músculos sólo afecta al reparto (el mapa es siempre la última semana), así que su
  // selector va junto al reparto y no arriba, donde parecería que también cambia el mapa.
  { key: 'muscles', label: 'Músculos', usesPeriod: false },
  { key: 'records', label: 'Récords', usesPeriod: false },
  // Los rangos miran al histórico completo por definición: un récord que te subió de rango sigue
  // valiendo aunque lo hicieras hace meses, así que el filtro de periodo no le aplica.
  { key: 'ranks', label: 'Rangos', usesPeriod: false },
  { key: 'exercises', label: 'Ejercicios', usesPeriod: false },
];

// Enlaces antiguos (?view=muscleMap de versiones anteriores, marcadores...) siguen llevando a su contenido.
const LEGACY_VIEWS = {
  muscleMap: 'muscles',
  seriesByGroup: 'muscles',
  distChart: 'muscles',
  weekly: 'overview',
  monthly: 'overview',
  exerciseStats: 'exercises',
};

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

  // Enlace profundo a una vista (?view=muscles), p.ej. desde "Músculos esta semana" en Inicio.
  // Se lee de window.location al montar (no con useRouter): navegar a esta página siempre la
  // monta de nuevo, y así la pantalla no depende de un router montado (los tests la renderizan sola).
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('view');
    const view = LEGACY_VIEWS[raw] || raw;
    if (view && VIEWS.some((v) => v.key === view)) setActiveView(view);
  }, []);

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
  const weeklyGoal = resolveWeeklyGoal(user);
  const weeklyStreak = useMemo(() => computeWeeklyStreak(workouts || [], weeklyGoal), [workouts, weeklyGoal]);


  const deltaPct = useMemo(() => {
    if (previousVolume === null || previousVolume === 0) return null;
    return ((stats.totalVolume - previousVolume) / previousVolume) * 100;
  }, [stats.totalVolume, previousVolume]);

  return (
    <Layout gutter>
      <PageHeader
        isDark={isDark}
        isMobile={isNarrow}
        title={t("statistics")}
        compact
        subtitle={isNarrow ? undefined : "Analiza tu progreso y mejora tu entrenamiento con datos detallados"}
      />

      <ChipNav
        items={VIEWS}
        activeKey={activeView}
        onChange={changeView}
        isDark={isDark}
        fill={isNarrow}
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

            <StatStrip
              isDark={isDark}
              columns={isNarrow ? 2 : 4}
              items={[
                {
                  key: 'streak',
                  label: 'Racha semanal',
                  value: weeklyStreak.streak === 0 ? 'Sin racha' : `${weeklyStreak.streak} ${weeklyStreak.streak === 1 ? 'semana' : 'semanas'}`,
                  highlight: weeklyStreak.goalMet,
                  progress: weeklyStreak.thisWeek / weeklyStreak.goal,
                  sub: `${weeklyStreak.thisWeek} de ${weeklyStreak.goal} esta semana · mejor: ${weeklyStreak.best}`,
                },
                { key: 'avgTime', label: 'Tiempo medio', value: `${stats.avgTimeMin} min`, sub: 'por entreno' },
                { key: 'avgVolume', label: 'Volumen medio', value: `${stats.avgVolume.toLocaleString('es-ES')} kg`, sub: 'por entreno' },
                { key: 'density', label: 'Series por entreno', value: stats.sessions ? (stats.totalSeries / stats.sessions).toLocaleString('es-ES', { maximumFractionDigits: 1 }) : '—', sub: stats.bestDay ? `más entrenos en ${stats.bestDay}` : undefined },
              ]}
            />

            <ProgressChart workouts={workouts || []} isDark={isDark} />
            <ConsistencyHeatmap
              workouts={workouts || []}
              isDark={isDark}
              caption={weeklyStreak.goalMet ? 'Objetivo de la semana cumplido' : undefined}
            />
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

        {activeView === 'muscles' && (
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
            <>
              <MuscleMapSection
                isDark={isDark}
                isMobile={isNarrow}
                workouts={workouts}
                t={t}
                sex={user?.sex ?? null}
                faceStyleId={user?.faceStyle}
                onSelectMuscle={setSelectedMuscle}
              />
              <div style={{ marginBottom: tk.space.md }}>
                <ChipNav
                  items={PERIOD_OPTIONS}
                  activeKey={selectedPeriod}
                  onChange={setSelectedPeriod}
                  isDark={isDark}
                  size="sm"
                  ariaLabel="Periodo"
                />
              </div>
              <MuscleBreakdown workouts={filteredWorkouts} isDark={isDark} t={t} periodLabel={period.label} />
            </>
          )
        )}

        {activeView === 'records' && (
          <RecordsSection isDark={isDark} isMobile={isNarrow} workouts={workouts} t={t} language={language} />
        )}

        {/* Rangos no entra en MuscleDetailSection como hace el mapa muscular: su lista despliega los
            ejercicios de cada grupo en el sitio, sin salir de la vista ni pagar el viaje de ida y
            vuelta con un "Volver al mapa". */}
        {activeView === 'ranks' && (
          <RankMapSection isDark={isDark} isMobile={isNarrow} t={t} language={language} />
        )}

        {activeView === 'exercises' && (
          <ExerciseStatsSection isDark={isDark} isMobile={isNarrow} workouts={workouts} t={t} language={language} />
        )}
      </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
