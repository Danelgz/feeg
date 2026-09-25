import { motion, useReducedMotion } from "motion/react";
import { getTokens } from "../../lib/tokens";
import { routineMuscleGroups, type InsightRoutine } from "../../lib/homeInsights";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import Icon from "../ui/Icon";
import MuscleGroupIcon from "../ui/MuscleGroupIcon";

interface RoutineCardProps {
  routine: InsightRoutine & { public?: boolean };
  isDark: boolean;
  language: string;
  t: (key: string) => string;
  /** Texto de "última vez" ya formateado (hoy / hace 3 días / sin estrenar). */
  lastDoneLabel: string;
  /** Marca la rutina sugerida (la misma que Inicio propone en "Te toca"). */
  isNext: boolean;
  index: number;
  onStart: () => void;
  onEdit: () => void;
  onMore: () => void;
}

/**
 * Tarjeta de rutina: todo lo necesario para decidir y empezar, en ~110px de alto.
 *
 * La acción principal (empezar) es el círculo de la derecha, al alcance del pulgar; tocar el resto
 * de la tarjeta abre la edición; lo destructivo vive en el menú ⋯. Los grupos musculares se ven como
 * mini-cuerpos para distinguir "Empuje" de "Pierna" sin leer.
 */
export default function RoutineCard({ routine, isDark, language, t, lastDoneLabel, isNext, index, onStart, onEdit, onMore }: RoutineCardProps) {
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const exercises = routine.exercises || [];
  const seriesCount = exercises.reduce((sum, ex) => sum + (ex.series?.length || 0), 0);
  const groups = routineMuscleGroups(routine, 4);
  const preview = exercises
    .slice(0, 4)
    .map((ex) => translateExerciseName(ex.name || "", language))
    .join(" · ");

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 12px 14px 16px",
        borderRadius: 20,
        background: isNext
          ? isDark
            ? "linear-gradient(135deg, rgba(29,209,161,0.12) 0%, #141414 60%)"
            : "linear-gradient(135deg, rgba(29,209,161,0.14) 0%, #ffffff 60%)"
          : tk.surface,
        border: `1px solid ${isNext ? (isDark ? "rgba(29,209,161,0.3)" : "rgba(29,209,161,0.35)") : tk.border}`,
        boxShadow: tk.shadow.card,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(e) => e.key === "Enter" && onEdit()}
        className="feeg-press"
        style={{ flex: 1, minWidth: 0, cursor: "pointer", ["--feeg-press-scale" as string]: 0.985 } as React.CSSProperties}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: "1.08rem",
              fontWeight: 800,
              color: tk.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: "-0.01em",
            }}
          >
            {routine.name}
          </h3>
          {routine.public === false && <Icon name="eyeOff" size={14} color={tk.textFaint} aria-label={t("private_label")} />}
          {isNext && (
            <span
              style={{
                flexShrink: 0,
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "3px 7px",
                borderRadius: 99,
                color: tk.onAccent,
                background: tk.accent,
              }}
            >
              {t("next_up")}
            </span>
          )}
        </div>

        {preview && (
          <div style={{ fontSize: "0.8rem", color: tk.textMuted, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {preview}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, minWidth: 0 }}>
          {groups.length > 0 && (
            <div style={{ display: "flex", flexShrink: 0 }}>
              {groups.map((g, i) => (
                <span
                  key={g}
                  title={t(g)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    overflow: "hidden",
                    marginLeft: i === 0 ? 0 : -7,
                    border: `2px solid ${isNext && isDark ? "#101a17" : tk.surface}`,
                    background: tk.surfaceAlt,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MuscleGroupIcon group={g} isDark={isDark} size={22} />
                </span>
              ))}
            </div>
          )}
          <span style={{ fontSize: "0.74rem", color: tk.textFaint, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {exercises.length} {exercises.length === 1 ? t("exercise_singular") : t("exercises").toLowerCase()} · {seriesCount} {t("series_short")} · {lastDoneLabel}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onStart}
          aria-label={`${t("start_routine")}: ${routine.name}`}
          className="feeg-press"
          style={{
            width: 48,
            height: 48,
            borderRadius: 99,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: 3,
            color: tk.onAccent,
            background: `linear-gradient(145deg, #3ee8b8 0%, ${tk.accent} 60%, #12a883 100%)`,
            boxShadow: "0 6px 18px rgba(29,209,161,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
            ["--feeg-press-scale" as string]: 0.88,
          } as React.CSSProperties}
        >
          <Icon name="play" size={20} />
        </button>
        <button
          type="button"
          onClick={onMore}
          aria-label={t("routine_options")}
          className="feeg-press"
          style={{
            width: 36,
            height: 24,
            borderRadius: 99,
            border: "none",
            background: "transparent",
            color: tk.textMuted,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="moreHorizontal" size={20} />
        </button>
      </div>
    </motion.div>
  );
}
