import { getWorkoutTokens } from "../../lib/tokens";

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Fila de estadísticas en vivo (modo "en vivo") o estimadas (modo "plantilla"). */
export default function WorkoutStatsBar({ mode = "live", elapsedSeconds, totalVolume, totalSeries, exerciseCount }) {
  const tk = getWorkoutTokens();

  const items =
    mode === "live"
      ? [
          { label: "Duración", value: formatElapsed(elapsedSeconds || 0) },
          { label: "Volumen", value: `${(totalVolume || 0).toLocaleString()} kg` },
          { label: "Series", value: totalSeries || 0 },
        ]
      : [
          { label: "Ejercicios", value: exerciseCount || 0 },
          { label: "Volumen Est.", value: `${(totalVolume || 0).toLocaleString()} kg` },
          { label: "Series", value: totalSeries || 0 },
        ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "0 20px 20px 20px",
        backgroundColor: tk.bg,
        borderBottom: `1px solid ${tk.surfaceAlt}`,
      }}
    >
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ color: tk.textFaint, fontSize: "0.75rem", marginBottom: "4px" }}>{item.label}</div>
          <div style={{ color: item.label === "Volumen" || item.label === "Volumen Est." ? tk.text : tk.accent, fontSize: "1.1rem", fontWeight: 500 }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
