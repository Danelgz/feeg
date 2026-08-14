import { useEffect, useRef, useState } from "react";
import { getTokens } from "../../lib/tokens";
import { filterSessionsByPeriod } from "../../lib/exerciseProfile";

const SPANISH_MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const BAR_WIDTH = 30;

const PERIODS = [
  { key: "30d", label: "30 días", days: 30 },
  { key: "3m", label: "3 meses", days: 90 },
  { key: "1y", label: "1 año", days: 365 },
  { key: "all", label: "Siempre", days: null },
];

/**
 * Progreso del mejor set por sesión (mismo patrón de barras + chips de periodo que
 * ProfileActivityChart, pero una barra por SESIÓN de este ejercicio, no por semana — con la
 * frecuencia real de un ejercicio concreto, agrupar por semana dejaría casi todas las barras
 * vacías).
 */
export default function ExerciseProgressChart({ isDark = true, sessions, unit }) {
  const tk = getTokens(isDark);
  const [period, setPeriod] = useState("3m");
  const [activeBar, setActiveBar] = useState(null);
  const scrollRef = useRef(null);

  const periodDays = PERIODS.find((p) => p.key === period)?.days ?? 90;
  const withBestSet = (sessions || []).filter((s) => s.bestSet);
  const filtered = filterSessionsByPeriod(withBestSet, periodDays)
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const maxWeight = Math.max(1, ...filtered.map((s) => s.bestSet.weight));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    setActiveBar(null);
  }, [period, filtered.length]);

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className="feeg-press"
            style={{
              padding: "7px 14px",
              borderRadius: tk.radius.pill,
              border: "none",
              backgroundColor: period === p.key ? tk.accent : tk.surfaceAlt,
              color: period === p.key ? tk.onAccent : tk.textMuted,
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              "--feeg-press-scale": 0.95,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: tk.textFaint, backgroundColor: tk.surfaceAlt, borderRadius: tk.radius.md }}>
          Sin sesiones en este periodo
        </div>
      ) : (
        <div
          ref={scrollRef}
          style={{
            height: "170px",
            display: "flex",
            alignItems: "flex-end",
            gap: "10px",
            marginBottom: "10px",
            paddingTop: "30px",
            paddingBottom: "4px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {filtered.map((session, i) => (
            <div
              key={`${session.workoutId}-${i}`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveBar(activeBar?.i === i ? null : { i, x: rect.left + rect.width / 2, y: rect.top });
              }}
              style={{ position: "relative", width: `${BAR_WIDTH}px`, flexShrink: 0, height: "100%", display: "flex", alignItems: "flex-end", cursor: "pointer" }}
            >
              <div
                style={{
                  width: "100%",
                  backgroundColor: activeBar?.i === i ? tk.text : tk.accent,
                  height: `${Math.max(6, (session.bestSet.weight / maxWeight) * 100)}%`,
                  borderRadius: "6px 6px 3px 3px",
                  transition: "all 0.2s ease",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  lineHeight: 1.25,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: tk.textFaint, fontSize: "0.56rem", fontWeight: 700, textTransform: "uppercase" }}>
                  {SPANISH_MONTHS_SHORT[session.date.getMonth()]}
                </span>
                <span style={{ color: tk.textFaint, fontSize: "0.6rem", fontWeight: 700 }}>{session.date.getDate()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeBar && filtered[activeBar.i] && (
        <div
          style={{
            position: "fixed",
            left: activeBar.x,
            top: activeBar.y - 12,
            transform: "translate(-50%, -100%)",
            backgroundColor: tk.text,
            color: tk.bg,
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "0.8rem",
            whiteSpace: "nowrap",
            zIndex: 200,
            fontWeight: "bold",
            boxShadow: tk.shadow.float,
            pointerEvents: "none",
          }}
        >
          {filtered[activeBar.i].bestSet.weight}{unit} × {filtered[activeBar.i].bestSet.reps} · {filtered[activeBar.i].date.toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
