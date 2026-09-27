import { getWorkoutTokens } from "../../lib/tokens";

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} min`;
}

/**
 * Cifras del entreno bajo la cabecera: tres columnas centradas con separadores finos, la cifra
 * grande y la etiqueta debajo. En vivo el cronómetro lleva un punto que late (se está grabando) y
 * las series se leen como hechas/planificadas, que es la pregunta real a mitad de sesión: "¿cuánto
 * me queda?". Con `finished` (un entreno ya guardado) la duración se lee como tiempo total
 * ("1 h 05 min") y no como un cronómetro.
 */
export default function WorkoutStatsBar({ mode = "live", elapsedSeconds, totalVolume, totalSeries, plannedSeries, exerciseCount, t, recording = false, finished = false }) {
  const tk = getWorkoutTokens();
  const translate = t || ((s) => s);
  const volume = `${Math.round(totalVolume || 0).toLocaleString("es-ES")} kg`;

  const items =
    mode === "live"
      ? [
          { key: "duration", label: translate("duration_label"), value: finished ? formatDuration(elapsedSeconds || 0) : formatElapsed(elapsedSeconds || 0), live: recording },
          { key: "volume", label: translate("volume"), value: volume },
          { key: "series", label: translate("series_label"), value: plannedSeries ? `${totalSeries || 0}/${plannedSeries}` : totalSeries || 0 },
        ]
      : [
          { key: "exercises", label: translate("exercises_count"), value: exerciseCount || 0 },
          { key: "volume", label: `${translate("volume")} est.`, value: volume },
          { key: "series", label: translate("series_label"), value: totalSeries || 0 },
        ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        margin: "0 16px",
        padding: "10px 0",
        backgroundColor: tk.bg,
        borderTop: `1px solid ${tk.hairline}`,
        borderBottom: `1px solid ${tk.hairline}`,
      }}
    >
      {items.map((item, i) => (
        <div key={item.key} style={{ textAlign: "center", borderLeft: i ? `1px solid ${tk.hairline}` : "none", minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: item.key === "duration" && !finished ? tk.accent : tk.text,
              fontSize: "1.18rem",
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
            }}
          >
            {item.live && <span className="feeg-rec-dot" aria-hidden style={{ width: 7, height: 7, borderRadius: 9, background: tk.accent }} />}
            {item.value}
          </div>
          <div style={{ color: tk.textFaint, fontSize: "0.64rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{item.label}</div>
        </div>
      ))}
      <style>{`
        .feeg-rec-dot { animation: feeg-rec 1.6s ease-in-out infinite; }
        @keyframes feeg-rec { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        @media (prefers-reduced-motion: reduce) { .feeg-rec-dot { animation: none; } }
      `}</style>
    </div>
  );
}
