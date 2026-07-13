import { useEffect, useRef, useState } from "react";

const SPANISH_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const BAR_WIDTH = 34;

function formatRangeDate(date) {
  return date ? `${date.getDate()} ${SPANISH_MONTHS[date.getMonth()]}` : "";
}

/**
 * Solo genera una barra por semana que tuvo AL MENOS un entreno — nada de relleno para semanas
 * vacías (antes "Siempre" arrancaba en 1970 y rellenaba miles de semanas en blanco hasta el
 * primer entreno real, aplastando los datos útiles en una esquina). Así el primer punto del
 * gráfico es siempre tu primer entreno real, y un parón de varias semanas simplemente no deja
 * huecos en blanco en medio del gráfico.
 */
function getChartData(completedWorkouts, chartFilter) {
  if (!completedWorkouts || !Array.isArray(completedWorkouts)) return [];

  try {
    const now = new Date();
    let minDate = null;
    if (chartFilter === "3_months") { minDate = new Date(); minDate.setMonth(now.getMonth() - 3); }
    else if (chartFilter === "6_months") { minDate = new Date(); minDate.setMonth(now.getMonth() - 6); }
    else if (chartFilter === "1_year") { minDate = new Date(); minDate.setFullYear(now.getFullYear() - 1); }
    // "always": sin límite inferior — el primer punto será tu primer entreno real.

    const weeksMap = {};

    completedWorkouts.forEach((w) => {
      if (!w || !w.completedAt) return;
      const date = new Date(w.completedAt);
      if (isNaN(date.getTime()) || (minDate && date < minDate)) return;

      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(new Date(date).setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const weekKey = monday.toISOString().split("T")[0];

      if (!weeksMap[weekKey]) {
        const weekEnd = new Date(monday);
        weekEnd.setDate(monday.getDate() + 6);
        weeksMap[weekKey] = {
          duration: 0,
          volume: 0,
          reps: 0,
          count: 0,
          date: monday,
          range: `${monday.getDate()}-${weekEnd.getDate()}`,
        };
      }

      const week = weeksMap[weekKey];
      week.duration += (Number(w.elapsedTime) || Number(w.totalTime) * 60 || 0) / 3600;
      week.volume += Number(w.totalVolume) || 0;
      week.reps += Number(w.totalReps) || 0;
      week.count += 1;
    });

    return Object.values(weeksMap).sort((a, b) => a.date - b.date);
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
  const scrollRef = useRef(null);

  const chartData = getChartData(completedWorkouts, chartFilter);
  const overallRange = chartData.length > 0 ? `(${formatRangeDate(chartData[0].date)} — ${formatRangeDate(new Date())})` : "";
  const maxVal = Math.max(chartMode === "duration" ? 5 : 1, ...chartData.map((d) => d[chartMode]), 1);

  // Arranca mostrando las semanas más recientes (el extremo derecho), que es lo que casi
  // siempre se quiere ver primero; deslizar hacia la izquierda revela el histórico.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
    setActiveBar(null);
  }, [chartFilter, chartData.length]);

  return (
    <div style={{ marginBottom: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "8px" }}>
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
          Actividad semanal <span style={{ color: "#888", fontSize: "0.8rem", marginLeft: "5px" }}>{overallRange}</span>
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

      {chartData.length === 0 ? (
        <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "#444", backgroundColor: "#111", borderRadius: "12px" }}>
          Sin datos suficientes
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
            paddingTop: "24px",
            paddingBottom: "4px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {chartData.map((d, i) => (
            <div
              key={i}
              onClick={() => setActiveBar(activeBar === i ? null : i)}
              style={{
                position: "relative",
                width: `${BAR_WIDTH}px`,
                flexShrink: 0,
                height: "100%",
                display: "flex",
                alignItems: "flex-end",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "100%",
                  backgroundColor: activeBar === i ? "#fff" : d[chartMode] > 0 ? "#1dd1a1" : "#1a1a1a",
                  border: d[chartMode] === 0 ? "1px solid #333" : "none",
                  height: `${Math.max(6, (d[chartMode] / maxVal) * 100)}%`,
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
                  color: "#555",
                  fontSize: "0.62rem",
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                }}
              >
                {d.range}
              </div>
              {activeBar === i && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 20px)",
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
          ))}
        </div>
      )}

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
