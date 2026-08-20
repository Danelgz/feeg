import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import MiniStat from "./MiniStat";
import StatSection from "./StatSection";
import { EmptyState } from "../ui";
import { getTokens } from "../../lib/tokens";

interface Workout {
  completedAt?: string;
  series?: number;
  totalReps?: number;
  totalVolume?: number;
  totalTime?: number;
  elapsedTime?: number;
}

interface WeekEntry {
  key: string;
  label: string;
  sessions: number;
  series: number;
  reps: number;
  volume: number;
  timeMin: number;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
}

function getWeekKey(date: Date) {
  const start = startOfWeek(date);
  return start.toISOString().slice(0, 10);
}

function weekLabel(key: string, currentKey: string) {
  if (key === currentKey) return "Esta semana";
  const start = new Date(`${key}T00:00:00`);
  return `Semana del ${start.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;
}

export default function WeeklyReportSection({ isDark, isMobile, workouts, t }: { isDark: boolean; isMobile: boolean; workouts: Workout[]; t: (key: string) => string }) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  const currentKey = getWeekKey(new Date());

  const entries = useMemo<WeekEntry[]>(() => {
    const byWeek = new Map<string, WeekEntry>();
    const currentStart = startOfWeek(new Date());
    for (let offset = 0; offset < 8; offset += 1) {
      const weekStart = new Date(currentStart);
      weekStart.setDate(weekStart.getDate() - offset * 7);
      const key = getWeekKey(weekStart);
      byWeek.set(key, { key, label: weekLabel(key, currentKey), sessions: 0, series: 0, reps: 0, volume: 0, timeMin: 0 });
    }

    workouts.forEach((workout) => {
      if (!workout.completedAt) return;
      const key = getWeekKey(new Date(workout.completedAt));
      const entry = byWeek.get(key);
      if (!entry) return;
      entry.sessions += 1;
      entry.series += Number(workout.series || 0);
      entry.reps += Number(workout.totalReps || 0);
      entry.volume += Number(workout.totalVolume || 0);
      entry.timeMin += workout.elapsedTime !== undefined
        ? Math.round(Number(workout.elapsedTime || 0) / 60)
        : Number(workout.totalTime || 0);
    });

    return [...byWeek.values()];
  }, [workouts, currentKey]);

  return (
    <StatSection title="Informe semanal" meta="Últimas 8 semanas" isDark={isDark} isMobile={isMobile}>
      {workouts.length === 0 ? (
        <EmptyState isDark={isDark} icon="clock" title={t("stats_no_data")} description="Completa tu primer entrenamiento para empezar a ver tu ritmo semanal." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: tk.space.md }}>
          {entries.map((entry, index) => (
            <motion.div
              key={entry.key}
              className="feeg-surface feeg-hover"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: tk.motion.duration.base, ease: tk.motion.ease.out, delay: prefersReducedMotion ? 0 : index * tk.motion.stagger }}
              style={{
                borderRadius: tk.radius.md,
                padding: isMobile ? tk.space.md : tk.space.lg,
                "--feeg-bg": entry.key === currentKey ? tk.accentSoft : tk.surfaceAlt,
                "--feeg-border": entry.key === currentKey ? tk.accent : tk.border,
                "--feeg-hover-border": tk.accent,
              } as React.CSSProperties}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: tk.space.md, marginBottom: tk.space.md }}>
                <strong style={{ color: tk.text, fontSize: tk.fontSize.md }}>{entry.label}</strong>
                <span style={{ color: entry.sessions > 0 ? tk.accent : tk.textFaint, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium }}>
                  {entry.sessions} {entry.sessions === 1 ? "entreno" : "entrenos"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: tk.space.md }}>
                <MiniStat label="Series" value={entry.series.toLocaleString("es-ES")} isDark={isDark} />
                <MiniStat label="Reps" value={entry.reps.toLocaleString("es-ES")} isDark={isDark} />
                <MiniStat label="Volumen" value={`${Math.round(entry.volume).toLocaleString("es-ES")} kg`} isDark={isDark} />
                <MiniStat label="Tiempo" value={`${entry.timeMin.toLocaleString("es-ES")} min`} isDark={isDark} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </StatSection>
  );
}
