import { useState } from "react";

const SPANISH_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatRangeDate(date) {
  return date ? `${date.getDate()} ${SPANISH_MONTHS[date.getMonth()]}` : "";
}

function getChartData(completedWorkouts, chartFilter) {
  if (!completedWorkouts || !Array.isArray(completedWorkouts)) return [];

  try {
    const now = new Date();
    let startDate = new Date();
    if (chartFilter === "3_months") startDate.setMonth(now.getMonth() - 3);
    else if (chartFilter === "6_months") startDate.setMonth(now.getMonth() - 6);
    else if (chartFilter === "1_year") startDate.setFullYear(now.getFullYear() - 1);
    else startDate = new Date(0);

    // Alinear startDate al lunes de esa semana
    const startDay = startDate.getDay();
    const startDiff = startDate.getDate() - startDay + (startDay === 0 ? -6 : 1);
    startDate = new Date(new Date(startDate).setDate(startDiff));
    startDate.setHours(0, 0, 0, 0);

    const weeks = [];
    const weeksMap = {};

    // Generar todas las semanas desde startDate hasta hoy
    let current = new Date(startDate);
    while (current <= now) {
      const weekKey = current.toISOString().split("T")[0];
      const weekEnd = new Date(current);
      weekEnd.setDate(current.getDate() + 6);

      const weekObj = {
        duration: 0,
        volume: 0,
        reps: 0,
        count: 0,
        date: new Date(current),
        range: `${current.getDate()}-${weekEnd.getDate()}`,
      };
      weeksMap[weekKey] = weekObj;
      weeks.push(weekObj);

      current.setDate(current.getDate() + 7);
    }

    completedWorkouts.forEach((w) => {
      if (!w || !w.completedAt) return;
      const date = new Date(w.completedAt);
      if (isNaN(date.getTime()) || date < startDate) return;

      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(new Date(date).setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const weekKey = monday.toISOString().split("T")[0];

      if (weeksMap[weekKey]) {
        weeksMap[weekKey].duration += (Number(w.elapsedTime) || Number(w.totalTime) * 60 || 0) / 3600;
        weeksMap[weekKey].volume += Number(w.totalVolume) || 0;
        weeksMap[weekKey].reps += Number(w.totalReps) || 0;
        weeksMap[weekKey].count += 1;
      }
    });

    return weeks;
  } catch (e) {
    console.error("Error generating chart data:", e);
    return [];
  }
}

const CHART_MODES = [
  { id: "duration", label: "Duración" },
  { id: "volume", label: "Volumen" },
  { id: "reps", label: "Repeticiones" },
];

/** Gráfico de barras semanal (duración/volumen/reps) de la sección de perfil — autocontenido. */
export default function ProfileActivityChart({ completedWorkouts }) {
  const [chartFilter, setChartFilter] = useState("3_months");
  const [chartMode, setChartMode] = useState("duration");
  const [activeBar, setActiveBar] = useState(null);

  const chartData = getChartData(completedWorkouts, chartFilter);
  const overallRange = chartData.length > 0 ? `(${formatRangeDate(chartData[0].date)}, ${formatRangeDate(new Date())})` : "";
  const maxVal = Math.max(chartMode === "duration" ? 5 : 1, ...chartData.map((d) => d[chartMode]), 1);

  return (
    <div style={{ marginBottom: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
          Gráfico horas por semana <span style={{ color: "#888", fontSize: "0.8rem", marginLeft: "5px" }}>{overallRange}</span>
        </h2>
        <select
          value={chartFilter}
          onChange={(e) => setChartFilter(e.target.value)}
          style={{ background: "none", border: "none", color: "#1dd1a1", fontSize: "0.9rem", cursor: "pointer", outline: "none" }}
        >
          <option value="3_months" style={{ backgroundColor: "#1a1a1a" }}>Últimos 3 meses</option>
          <option value="6_months" style={{ backgroundColor: "#1a1a1a" }}>Últimos 6 meses</option>
          <option value="1_year" style={{ backgroundColor: "#1a1a1a" }}>Último año</option>
          <option value="always" style={{ backgroundColor: "#1a1a1a" }}>Siempre</option>
        </select>
      </div>

      <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "10px", position: "relative", paddingTop: "20px" }}>
        {chartData.length === 0 ? (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>Sin datos suficientes</div>
        ) : (
          chartData.map((d, i) => (
            <div
              key={i}
              onClick={() => setActiveBar(activeBar === i ? null : i)}
              style={{
                flex: 1,
                backgroundColor: activeBar === i ? "#fff" : d[chartMode] > 0 ? "#1dd1a1" : "#1a1a1a",
                border: d[chartMode] === 0 ? "1px solid #333" : "none",
                height: `${Math.max(5, (d[chartMode] / maxVal) * 100)}%`,
                borderRadius: "2px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              {i % 2 === 0 && (
                <div style={{ position: "absolute", bottom: "105%", left: "50%", transform: "translateX(-50%)", color: "#555", fontSize: "0.6rem", whiteSpace: "nowrap", fontWeight: "bold" }}>
                  {d.range}
                </div>
              )}
              {activeBar === i && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "110%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#fff",
                    color: "#000",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    fontWeight: "bold",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.5)",
                  }}
                >
                  {chartMode === "duration" ? `${d.duration.toFixed(1)}h` : chartMode === "volume" ? `${d.volume.toLocaleString()}kg` : `${d.reps.toLocaleString()} reps`}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        {CHART_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setChartMode(m.id)}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "20px",
              border: "none",
              backgroundColor: chartMode === m.id ? "#1dd1a1" : "#1a1a1a",
              color: chartMode === m.id ? "#000" : "#fff",
              fontSize: "0.9rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
