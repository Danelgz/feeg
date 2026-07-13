import { getWorkoutTokens } from "../../lib/tokens";
import { getExerciseInfo } from "../../lib/exerciseStats";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { ExerciseThumb } from "../workout";
import { Icon } from "../ui";

function formatDuration(workout) {
  const totalSeconds = workout.elapsedTime || (workout.totalTime || 0) * 60;
  const m = Math.floor(totalSeconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

/**
 * Vista a pantalla completa de un entreno ya terminado — mismos tokens oscuros que el modo
 * "en vivo" (create/empty/[id]), para que revisar un entreno pasado se sienta como estar
 * dentro de él, en vez del recuadro expandible plano que había antes.
 */
export default function ProfileWorkoutDetailModal({ workout, language, onClose }) {
  const tk = getWorkoutTokens();
  if (!workout) return null;

  const exercises = workout.exerciseDetails || [];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: tk.bg,
        zIndex: 6000,
        display: "flex",
        flexDirection: "column",
        animation: "profile-detail-in 0.25s ease-out",
      }}
    >
      <style>{`
        @keyframes profile-detail-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "18px 20px", borderBottom: `1px solid ${tk.border}` }}>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            background: tk.surfaceAlt,
            border: "none",
            borderRadius: tk.radius.full,
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tk.text,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Icon name="close" size={18} />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: tk.text, fontSize: "1.15rem", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {workout.name}
          </div>
          <div style={{ color: tk.textFaint, fontSize: "0.78rem", marginTop: "2px" }}>
            {new Date(workout.completedAt).toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px", paddingBottom: "60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", maxWidth: "480px", margin: "0 auto 28px" }}>
          {[
            { label: "Duración", value: formatDuration(workout) },
            { label: "Volumen", value: `${(workout.totalVolume || 0).toLocaleString()} kg` },
            { label: "Series", value: workout.series || 0 },
          ].map((stat) => (
            <div key={stat.label} style={{ backgroundColor: tk.surface, border: `1px solid ${tk.border}`, borderRadius: tk.radius.md, padding: "14px 8px", textAlign: "center" }}>
              <div style={{ color: tk.accent, fontSize: "1.2rem", fontWeight: 700 }}>{stat.value}</div>
              <div style={{ color: tk.textFaint, fontSize: "0.7rem", textTransform: "uppercase", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {workout.comments && (
          <div
            style={{
              maxWidth: "480px",
              margin: "0 auto 24px",
              backgroundColor: tk.surface,
              borderLeft: `3px solid ${tk.accent}`,
              borderRadius: tk.radius.sm,
              padding: "12px 16px",
              color: tk.textMuted,
              fontSize: "0.9rem",
              fontStyle: "italic",
            }}
          >
            "{workout.comments}"
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: "480px", margin: "0 auto" }}>
          {exercises.map((ex, idx) => {
            const info = getExerciseInfo(ex.name);
            const isTimeBased = info?.type === "time";
            const isLastre = info?.unit === "lastre";

            return (
              <div key={idx} style={{ backgroundColor: tk.surface, border: `1px solid ${tk.border}`, borderRadius: tk.radius.lg, padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <ExerciseThumb name={ex.name} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "1rem", color: tk.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {translateExerciseName(ex.name, language)}
                    </div>
                    {ex.muscleGroup && (
                      <div style={{ fontSize: "0.72rem", color: tk.textFaint, textTransform: "uppercase", letterSpacing: "0.03em" }}>{ex.muscleGroup}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", padding: "6px 0", borderBottom: `1px solid ${tk.border}`, color: tk.textFaint, fontSize: "0.7rem", fontWeight: 700, textAlign: "center" }}>
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
                        padding: "9px 0",
                        textAlign: "center",
                        fontSize: "0.9rem",
                        color: tk.text,
                        backgroundColor: sIdx % 2 === 0 ? "transparent" : tk.surfaceAlt,
                        borderRadius: tk.radius.sm,
                      }}
                    >
                      <div style={{ color: tk.textFaint, fontWeight: 700 }}>{sIdx + 1}</div>
                      <div>{s.weight || "-"}{isTimeBased ? "m" : isLastre ? "L" : ""}</div>
                      <div>{s.reps || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
