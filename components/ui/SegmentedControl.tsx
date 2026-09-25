import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getTokens } from "../../lib/tokens";
import { tapFeedback } from "../../lib/haptics";

export interface Segment {
  key: string;
  label: string;
  badge?: number | string;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
  isDark: boolean;
  ariaLabel: string;
}

/**
 * Selector de 2-3 vistas hermanas con una "píldora" que se desliza hasta la opción elegida.
 * Para pocas opciones de igual peso (Rutinas / Historial); con más de tres, ChipNav.
 */
export default function SegmentedControl({ segments, value, onChange, isDark, ariaLabel }: SegmentedControlProps) {
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const layoutId = `seg-${useId()}`;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))`,
        padding: 4,
        borderRadius: 14,
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
        gap: 4,
      }}
    >
      {segments.map((seg) => {
        const active = seg.key === value;
        return (
          <button
            key={seg.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) tapFeedback();
              onChange(seg.key);
            }}
            style={{
              position: "relative",
              padding: "9px 10px",
              border: "none",
              background: "transparent",
              borderRadius: 11,
              cursor: "pointer",
              color: active ? tk.text : tk.textMuted,
              fontSize: "0.88rem",
              fontWeight: active ? 800 : 600,
              transition: `color ${tk.motion.css.fast}`,
              minWidth: 0,
            }}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 11,
                  background: isDark ? "#2a2a2a" : "#ffffff",
                  boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.08)",
                }}
              />
            )}
            <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%" }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seg.label}</span>
              {seg.badge !== undefined && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    padding: "1px 7px",
                    borderRadius: 99,
                    background: active ? tk.accentSoft : "transparent",
                    color: active ? tk.accent : tk.textFaint,
                  }}
                >
                  {seg.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
