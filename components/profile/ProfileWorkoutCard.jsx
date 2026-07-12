import { getExerciseInfo } from "../../lib/exerciseStats";
import { translateExerciseName } from "../../lib/exerciseTranslation";

/** Tarjeta de un entrenamiento completado en la lista de perfil, con detalle expandible de series. */
export default function ProfileWorkoutCard({ workout, expanded, onToggleExpand, onAddToRoutine, onDelete, onEdit, language }) {
  return (
    <div style={{ backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "12px", marginBottom: "15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#1dd1a1" }}>{workout.name}</div>
          <div style={{ fontSize: "0.8rem", color: "#888" }}>{new Date(workout.completedAt).toLocaleString()}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={onToggleExpand}
            style={{
              backgroundColor: expanded ? "#1dd1a1" : "rgba(29, 209, 161, 0.1)",
              border: "none",
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              color: expanded ? "#000" : "#1dd1a1",
              fontSize: "0.8rem",
              fontWeight: "700",
              transition: "all 0.2s ease",
            }}
          >
            {expanded ? "Ocultar" : "Detalles"}
          </button>
          <button
            onClick={onAddToRoutine}
            style={{
              backgroundColor: "rgba(46, 230, 197, 0.1)",
              border: "none",
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              color: "#2EE6C5",
              fontSize: "0.8rem",
              fontWeight: "600",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(46, 230, 197, 0.2)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(46, 230, 197, 0.1)")}
          >
            Añadir a Rutinas
          </button>
          <button
            onClick={onEdit}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "none",
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              color: "#aaa",
              fontSize: "0.8rem",
              fontWeight: "600",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.color = "#aaa";
            }}
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            style={{
              backgroundColor: "rgba(255, 71, 87, 0.1)",
              border: "none",
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              color: "#ff4757",
              fontSize: "0.8rem",
              fontWeight: "600",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#ff4757";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 71, 87, 0.1)";
              e.currentTarget.style.color = "#ff4757";
            }}
          >
            Borrar
          </button>
        </div>
      </div>
      <div style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: expanded ? "15px" : "0" }}>
        {workout.series} series • {workout.totalVolume?.toLocaleString()} kg • {workout.totalReps} reps • {workout.totalTime || Math.floor((workout.elapsedTime || 0) / 60)} min
      </div>

      {expanded && workout.exerciseDetails && (
        <div
          style={{
            backgroundColor: "#000",
            borderRadius: "12px",
            padding: "15px",
            display: "flex",
            flexDirection: "column",
            gap: "25px",
            border: "1px solid #1a1a1a",
            marginTop: "10px",
          }}
        >
          {workout.exerciseDetails.map((ex, idx) => {
            const info = getExerciseInfo(ex.name);
            const isTimeBased = info?.type === "time";
            const isLastre = info?.unit === "lastre";

            return (
              <div key={idx}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "35px",
                      height: "35px",
                      borderRadius: "50%",
                      backgroundColor: "#fff",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={`/exercises/${(ex?.name || "").toLowerCase().replace(/ /g, "_")}.png`}
                      onError={(e) => {
                        e.target.src = "/logo3.png";
                      }}
                      alt=""
                      style={{ width: "80%", height: "auto" }}
                    />
                  </div>
                  <div style={{ fontWeight: "500", fontSize: "1rem", color: "#1dd1a1" }}>{translateExerciseName(ex.name, language)}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", padding: "5px 0", borderBottom: "1px solid #1a1a1a", color: "#666", fontSize: "0.75rem", fontWeight: "bold", textAlign: "center" }}>
                    <div>SERIE</div>
                    <div>{isTimeBased ? "TIEMPO (MIN)" : isLastre ? "LASTRE (KG)" : "PESO (KG)"}</div>
                    <div>{isTimeBased ? "KM/H" : "REPS"}</div>
                  </div>
                  {ex.series.map((s, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "40px 1fr 1fr",
                        padding: "8px 0",
                        textAlign: "center",
                        fontSize: "0.9rem",
                        color: "#fff",
                        backgroundColor: sIdx % 2 === 0 ? "transparent" : "#0a0a0a",
                      }}
                    >
                      <div style={{ color: "#666", fontWeight: "bold" }}>{sIdx + 1}</div>
                      <div>{s.weight || "-"}{isTimeBased ? "m" : isLastre ? "L" : ""}</div>
                      <div>{s.reps || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
