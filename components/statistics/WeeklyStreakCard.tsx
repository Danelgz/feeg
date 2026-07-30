import { getTokens } from "../../lib/tokens";
import type { WeeklyStreakResult } from "../../lib/exerciseStats";

interface WeeklyStreakCardProps {
  streak: WeeklyStreakResult;
  isDark: boolean;
}

/**
 * Racha por semanas cumplidas, con el progreso de la semana en curso.
 *
 * Los segmentos son el objetivo (uno por entreno que falta) en vez de una barra continua: "3 de 4"
 * se lee de un vistazo en segmentos discretos, y una barra al 75% no dice cuántas sesiones quedan.
 * Los entrenos por encima del objetivo se suman aparte para no perder el reconocimiento de haber
 * hecho más de lo pedido.
 */
export default function WeeklyStreakCard({ streak, isDark }: WeeklyStreakCardProps) {
  const tk = getTokens(isDark);
  const { streak: weeks, thisWeek, goal, goalMet, best } = streak;
  const filled = Math.min(thisWeek, goal);
  const extra = Math.max(0, thisWeek - goal);

  return (
    <div
      className="feeg-surface"
      style={{
        borderRadius: tk.radius.md,
        padding: tk.space.lg,
        display: "flex",
        flexDirection: "column",
        gap: tk.space.md,
        "--feeg-bg": tk.surface,
        "--feeg-border": goalMet ? tk.accent : tk.border,
      } as React.CSSProperties}
    >
      <div>
        <div
          style={{
            fontSize: tk.fontSize.xs,
            color: tk.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: "2px",
          }}
        >
          Racha semanal
        </div>
        <div
          style={{
            fontSize: tk.fontSize.lg,
            fontWeight: tk.weight.bold,
            color: weeks > 0 ? tk.text : tk.textMuted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {weeks === 0 ? "Sin racha" : `${weeks} ${weeks === 1 ? "semana" : "semanas"}`}
        </div>
      </div>

      <div>
        <div
          style={{ display: "flex", gap: "3px", marginBottom: "6px" }}
          role="img"
          aria-label={`${thisWeek} de ${goal} entrenos esta semana`}
        >
          {Array.from({ length: goal }, (_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                backgroundColor: i < filled ? tk.accent : tk.border,
                transition: "background-color 220ms ease",
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: tk.fontSize.xs, color: tk.textFaint, fontVariantNumeric: "tabular-nums" }}>
          {thisWeek} de {goal} esta semana
          {extra > 0 && <span style={{ color: tk.accent }}> · +{extra}</span>}
          {best > weeks && <span> · mejor: {best}</span>}
        </div>
      </div>
    </div>
  );
}
