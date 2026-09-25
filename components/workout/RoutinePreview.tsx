import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getWorkoutTokens } from "../../lib/tokens";
import { getExerciseInfo } from "../../lib/exerciseStats";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { calendarDaysSince, routineMuscleGroups, type InsightWorkout } from "../../lib/homeInsights";
import { tapFeedback } from "../../lib/haptics";
import Icon from "../ui/Icon";
import MuscleGroupIcon from "../ui/MuscleGroupIcon";
import ExerciseThumb from "./ExerciseThumb";

interface PreviewSeries {
  reps?: number | string;
  weight?: number | string;
}

interface PreviewExercise {
  name: string;
  muscleGroup?: string;
  rest?: number;
  series: PreviewSeries[];
}

interface RoutinePreviewProps {
  routine: { id: string | number; name: string; exercises: PreviewExercise[] };
  completedWorkouts: InsightWorkout[];
  language: string;
  t: (key: string) => string;
  onStart: () => void;
  onEdit: () => void;
  onBack: () => void;
  /** Hueco inferior que ocupa la barra de pestañas (el CTA flota justo encima). */
  bottomOffset: string;
}

const DEFAULT_REST = 90;
// Tiempo medio bajo carga por serie, para estimar la duración. Conservador a propósito: es mejor
// acabar antes de lo que dice la app que después.
const WORK_SECONDS_PER_SET = 45;

/** "3 × 8 · 80 kg" si todas las series son iguales; rango si no. */
function summarizeSeries(ex: PreviewExercise, t: (k: string) => string): string {
  const info = getExerciseInfo(ex.name);
  const series = ex.series || [];
  if (series.length === 0) return `0 ${t("series_short")}`;
  const reps = series.map((s) => Number(s.reps) || 0);
  const weights = series.map((s) => Number(s.weight) || 0);
  const minR = Math.min(...reps);
  const maxR = Math.max(...reps);
  const maxW = Math.max(...weights);
  const isTime = info?.type === "time";
  const repsLabel = minR === maxR ? `${minR}` : `${minR}-${maxR}`;
  const unit = isTime ? " min" : "";
  let text = `${series.length} × ${repsLabel}${unit}`;
  if (!isTime && maxW > 0) text += ` · ${maxW} ${info?.unit === "lastre" ? "kg +" : "kg"}`;
  return text;
}

/**
 * Vista previa de una rutina antes de empezarla.
 *
 * Sustituye a un bloque de texto ("Series 1: 8 Repeticiones - 80kg", un renglón por serie) con un
 * botón pequeño al final de la página. Ahora lo que importa se lee de un vistazo — qué músculos,
 * cuánto va a durar, cuándo se hizo por última vez — y el botón de empezar flota fijo al alcance del
 * pulgar, porque es lo único que se viene a hacer a esta pantalla.
 */
export default function RoutinePreview({ routine, completedWorkouts, language, t, onStart, onEdit, onBack, bottomOffset }: RoutinePreviewProps) {
  const tk = getWorkoutTokens();
  const reduceMotion = useReducedMotion();
  const exercises = routine.exercises || [];
  const totalSeries = exercises.reduce((sum, ex) => sum + (ex.series?.length || 0), 0);
  const estMinutes = Math.max(
    5,
    Math.round(exercises.reduce((sum, ex) => sum + (ex.series?.length || 0) * ((ex.rest || DEFAULT_REST) + WORK_SECONDS_PER_SET), 0) / 60 / 5) * 5
  );
  const groups = routineMuscleGroups({ ...routine, exercises }, 6);

  const last = useMemo(() => {
    const key = routine.name.trim().toLocaleLowerCase();
    let best: InsightWorkout | null = null;
    for (const w of completedWorkouts || []) {
      if ((w.name || "").trim().toLocaleLowerCase() !== key || !w.completedAt) continue;
      if (!best || new Date(w.completedAt) > new Date(best.completedAt as string)) best = w;
    }
    return best;
  }, [completedWorkouts, routine.name]);

  const lastLabel = (() => {
    const days = calendarDaysSince(last?.completedAt);
    if (days === null) return t("never_done");
    if (days === 0) return t("today_label");
    if (days === 1) return t("time_yesterday").toLowerCase();
    return t("days_ago").replace("{n}", String(days));
  })();

  const stats = [
    { icon: "list", value: String(exercises.length), label: t("exercises").toLowerCase() },
    { icon: "layers", value: String(totalSeries), label: t("series_short") },
    { icon: "timer", value: `~${estMinutes}`, label: "min" },
  ];

  return (
    <div style={{ minHeight: "100%", background: tk.bg, color: tk.text, paddingBottom: 110 }}>
      {/* Cabecera con halo de acento */}
      <div
        style={{
          position: "relative",
          padding: "14px 16px 20px",
          background: "radial-gradient(120% 90% at 100% 0%, rgba(46,230,197,0.18) 0%, rgba(46,230,197,0) 60%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" onClick={onBack} aria-label={t("back")} className="feeg-press" style={circleButton(tk)}>
            <Icon name="chevronLeft" size={20} />
          </button>
          <button type="button" onClick={onEdit} aria-label={t("edit")} className="feeg-press" style={circleButton(tk)}>
            <Icon name="edit" size={18} />
          </button>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ marginTop: 18, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: tk.accent }}>
            {t("last_workout_label")}: {lastLabel}
          </div>
          <h1 style={{ margin: "6px 0 0", fontSize: "2.1rem", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", wordBreak: "break-word" }}>
            {routine.name}
          </h1>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 18 }}>
            {stats.map((s) => (
              <div
                key={s.icon}
                style={{
                  padding: "10px 12px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <Icon name={s.icon} size={15} color={tk.accent} />
                <div style={{ fontSize: "1.25rem", fontWeight: 800, marginTop: 6, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "0.7rem", color: tk.textMuted, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {groups.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", scrollbarWidth: "none" }}>
              {groups.map((g) => (
                <span
                  key={g}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px 4px 4px",
                    borderRadius: 99,
                    background: "rgba(255,255,255,0.05)",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: tk.text,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ width: 24, height: 24, borderRadius: 99, overflow: "hidden", background: tk.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MuscleGroupIcon group={g} isDark size={20} />
                  </span>
                  {t(g)}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Lista de ejercicios */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {exercises.map((ex, i) => (
          <motion.div
            key={`${ex.name}-${i}`}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + Math.min(i, 10) * 0.04, duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px 12px 12px",
              borderRadius: 18,
              background: tk.surface,
              border: `1px solid ${tk.border}`,
            }}
          >
            <span style={{ width: 20, fontSize: "0.8rem", fontWeight: 800, color: tk.textFaint, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
            <ExerciseThumb name={ex.name} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {translateExerciseName(ex.name, language)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, fontSize: "0.8rem", color: tk.textMuted }}>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{summarizeSeries(ex, t)}</span>
                {ex.rest ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: tk.textFaint }}>
                    <Icon name="timer" size={12} />
                    {ex.rest}s
                  </span>
                ) : null}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA fijo */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: bottomOffset,
          padding: "12px 16px",
          background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 40%)",
          zIndex: 900,
        }}
      >
        <motion.button
          type="button"
          onClick={() => {
            tapFeedback("success");
            onStart();
          }}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          style={{
            width: "100%",
            maxWidth: 560,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "16px",
            borderRadius: 18,
            border: "none",
            cursor: "pointer",
            fontSize: "1.05rem",
            fontWeight: 800,
            color: tk.onAccent,
            background: `linear-gradient(135deg, #5ff0cc 0%, ${tk.accent} 45%, #16b896 100%)`,
            boxShadow: "0 12px 30px rgba(46,230,197,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          <Icon name="play" size={20} />
          {t("start_routine")}
        </motion.button>
      </div>
    </div>
  );
}

function circleButton(tk: ReturnType<typeof getWorkoutTokens>): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 99,
    border: `1px solid ${tk.border}`,
    background: "rgba(255,255,255,0.06)",
    color: tk.text,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
  };
}
