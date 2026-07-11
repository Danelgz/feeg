import { getWorkoutTokens } from "../../lib/tokens";

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Fila de estadísticas en vivo (modo "en vivo") o estimadas (modo "plantilla"). */
export default function WorkoutStatsBar({ mode = "live", elapsedSeconds, totalVolume, totalSeries, exerciseCount, t }) {
  const tk = getWorkoutTokens();
  const translate = t || ((s) => s);

  const items =
    mode === "live"
      ? [
          { key: "duration", label: translate("duration_label"), value: formatElapsed(elapsedSeconds || 0), accent: true },
          { key: "volume", label: translate("volume"), value: `${(totalVolume || 0).toLocaleString()} kg`, accent: false },
          { key: "series", label: translate("series_label"), value: totalSeries || 0, accent: true },
        ]
      : [
          { key: "exercises", label: translate("exercises_count"), value: exerciseCount || 0, accent: true },
          { key: "volume", label: `${translate("volume")} Est.`, value: `${(totalVolume || 0).toLocaleString()} kg`, accent: false },
          { key: "series", label: translate("series_label"), value: totalSeries || 0, accent: true },
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
        <div key={item.key}>
          <div style={{ color: tk.textFaint, fontSize: "0.75rem", marginBottom: "4px" }}>{item.label}</div>
          <div style={{ color: item.accent ? tk.accent : tk.text, fontSize: "1.1rem", fontWeight: 500 }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
