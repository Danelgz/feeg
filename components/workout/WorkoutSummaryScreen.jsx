import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

/**
 * Pantalla de finalización real, dentro del propio flujo (antes de navegar a otro sitio).
 * Sustituye el redirect inmediato + el bloque JSX muerto que existía en [id].js.
 */
export default function WorkoutSummaryScreen({ workout, prNames = [], onDone }) {
  const tk = getWorkoutTokens();
  const hasPRs = prNames.length > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        backgroundColor: tk.bg,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "84px",
          height: "84px",
          borderRadius: "50%",
          backgroundColor: tk.accentSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          animation: "workout-summary-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <Icon name="check" size={40} color={tk.accent} />
      </div>
      <style>{`
        @keyframes workout-summary-pop {
          0% { transform: scale(0.4); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <h1 style={{ color: tk.text, fontSize: "1.6rem", fontWeight: 800, margin: "0 0 6px" }}>
        ¡Entrenamiento completado!
      </h1>
      <p style={{ color: tk.textMuted, margin: "0 0 32px", fontSize: "0.95rem" }}>{workout.name}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          width: "100%",
          maxWidth: "360px",
          marginBottom: hasPRs ? "24px" : "36px",
        }}
      >
        {[
          { label: "Duración", value: formatDuration(workout.elapsedTime || 0) },
          { label: "Volumen", value: `${(workout.totalVolume || 0).toLocaleString()} kg` },
          { label: "Series", value: workout.series || 0 },
        ].map((stat) => (
          <div key={stat.label} style={{ backgroundColor: tk.surface, border: `1px solid ${tk.border}`, borderRadius: tk.radius.md, padding: "14px 8px" }}>
            <div style={{ color: tk.accent, fontSize: "1.2rem", fontWeight: 700 }}>{stat.value}</div>
            <div style={{ color: tk.textFaint, fontSize: "0.7rem", textTransform: "uppercase", marginTop: "4px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {hasPRs && (
        <div
          style={{
            width: "100%",
            maxWidth: "360px",
            backgroundColor: tk.accentSoft,
            border: `1px solid ${tk.accent}`,
            borderRadius: tk.radius.md,
            padding: "16px",
            marginBottom: "36px",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: tk.accent, fontWeight: 700, marginBottom: "8px" }}>
            <span style={{ fontSize: "1.1rem" }}>🏆</span> {prNames.length} récord{prNames.length > 1 ? "s" : ""} personal{prNames.length > 1 ? "es" : ""}
          </div>
          <div style={{ color: tk.text, fontSize: "0.85rem", lineHeight: 1.6 }}>
            {prNames.join(" · ")}
          </div>
        </div>
      )}

      <button
        onClick={onDone}
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "16px",
          backgroundColor: tk.accent,
          color: tk.onAccent,
          border: "none",
          borderRadius: tk.radius.md,
          fontSize: "1rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Listo
      </button>
    </div>
  );
}
