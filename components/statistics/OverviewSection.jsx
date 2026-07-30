import { motion, useReducedMotion } from "motion/react";
import MiniStat from "./MiniStat";
import StatSection from "./StatSection";
import { EmptyState } from "../ui";
import { getTokens } from "../../lib/tokens";

function getTimeAgo(completedAt) {
  if (!completedAt) return "";
  const seconds = Math.floor((Date.now() - new Date(completedAt).getTime()) / 1000);
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
}

export default function OverviewSection({ isDark, isMobile, workouts, t }) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  // Copia antes de ordenar: `workouts` llega de un useMemo de la página, y `sort` muta el array que
  // recibe — ordenarlo aquí reordenaba el valor memoizado que se reutiliza entre renders.
  const items = [...workouts]
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 8);

  return (
    <StatSection
      title="Entrenamientos recientes"
      meta={items.length > 0 ? `${items.length} registros` : undefined}
      isDark={isDark}
      isMobile={isMobile}
    >
      {workouts.length === 0 ? (
        <EmptyState
          isDark={isDark}
          icon="dumbbell"
          title={t("stats_no_data")}
          description="Comienza tu entrenamiento para ver estadísticas."
        />
      ) : (
        <div
          style={{
            maxHeight: "500px",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            paddingRight: tk.space.sm,
            display: "grid",
            gap: tk.space.md,
          }}
        >
          {items.map((w, index) => (
            <motion.div
              key={w.id}
              className="feeg-surface feeg-hover"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: tk.motion.duration.base,
                ease: tk.motion.ease.out,
                delay: prefersReducedMotion ? 0 : index * tk.motion.stagger,
              }}
              style={{
                borderRadius: tk.radius.md,
                padding: isMobile ? tk.space.md : tk.space.lg,
                "--feeg-bg": tk.surfaceAlt,
                "--feeg-border": tk.border,
                "--feeg-hover-border": tk.accent,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: tk.space.md,
                  marginBottom: tk.space.sm,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: tk.space.md, minWidth: 0 }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: tk.radius.full,
                      backgroundColor: tk.accentSoft,
                      color: tk.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: tk.weight.bold,
                      fontSize: tk.fontSize.sm,
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <strong
                    style={{
                      color: tk.text,
                      fontSize: tk.fontSize.md,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {w.name}
                  </strong>
                </div>
                <span
                  style={{
                    color: tk.textMuted,
                    fontSize: tk.fontSize.xs,
                    backgroundColor: tk.surface,
                    border: `1px solid ${tk.border}`,
                    padding: `${tk.space.xs} ${tk.space.md}`,
                    borderRadius: tk.radius.pill,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {getTimeAgo(w.completedAt)}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
                  gap: tk.space.md,
                }}
              >
                <MiniStat label="Ejercicios" value={w.exercises} isDark={isDark} />
                <MiniStat label="Series" value={w.series} isDark={isDark} />
                <MiniStat label="Reps" value={w.totalReps} isDark={isDark} />
                <MiniStat label="Volumen" value={(w.totalVolume || 0).toLocaleString()} isDark={isDark} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </StatSection>
  );
}
