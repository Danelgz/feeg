import { useState } from "react";
import { getTokens } from "../../lib/tokens";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { ExerciseThumb } from "../workout";
import { Icon } from "../ui";

/**
 * Vista previa de una rutina ajena antes de copiarla — "no copiar a ciegas". Lista sus ejercicios
 * y series tal cual quedarían en tu propia rutina, con el botón de copiar también aquí abajo para
 * no obligar a cerrar y volver a la tarjeta.
 */
export default function ProfileRoutinePreviewModal({ isDark = true, routine, language, onCopy, onClose }) {
  const tk = getTokens(isDark);
  const [justCopied, setJustCopied] = useState(false);
  if (!routine) return null;

  const seriesCount = routine.exercises.reduce((sum, ex) => sum + (ex.series?.length || 0), 0);

  const handleCopy = () => {
    if (justCopied) return;
    onCopy();
    setJustCopied(true);
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backgroundColor: "rgba(4, 8, 8, 0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap");
        @keyframes profileRoutinePreviewIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .profile-routine-preview-dialog { animation: none; } }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        className="profile-routine-preview-dialog"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          maxHeight: "min(680px, calc(100dvh - 40px))",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "24px",
          backgroundColor: tk.surface,
          border: `1px solid ${tk.border}`,
          boxShadow: "0 28px 90px rgba(0,0,0,0.42)",
          animation: "profileRoutinePreviewIn 220ms cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
          fontWeight: 500,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", padding: "20px 22px 16px", borderBottom: `1px solid ${tk.border}` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: tk.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {routine.name}
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: tk.textMuted, marginTop: "3px" }}>
              {routine.exercises.length} ejercicios · {seriesCount} series
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="feeg-press feeg-hover"
            style={{
              flexShrink: 0,
              width: "34px",
              height: "34px",
              display: "grid",
              placeItems: "center",
              border: `1px solid ${tk.border}`,
              borderRadius: "12px",
              background: "transparent",
              color: tk.textMuted,
              cursor: "pointer",
              "--feeg-hover-bg": tk.surfaceHover,
              "--feeg-hover-fg": tk.text,
              "--feeg-press-scale": 0.92,
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {routine.exercises.map((ex, idx) => {
              const isTimeBased = ex.type === "time";
              const isLastre = ex.unit === "lastre";

              return (
                <div key={idx} style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: "14px", padding: "13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <ExerciseThumb name={ex.name} size={34} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: tk.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {translateExerciseName(ex.name, language)}
                      </div>
                      {ex.group && (
                        <div style={{ fontSize: "0.68rem", color: tk.textFaint, textTransform: "uppercase", letterSpacing: "0.03em" }}>{ex.group}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {ex.series.map((s, sIdx) => (
                      <span
                        key={sIdx}
                        style={{
                          padding: "4px 9px",
                          borderRadius: tk.radius.pill,
                          backgroundColor: tk.surface,
                          border: `1px solid ${tk.border}`,
                          color: tk.textMuted,
                          fontSize: "0.74rem",
                          fontWeight: 600,
                        }}
                      >
                        {s.weight || "-"}{isTimeBased ? "min" : isLastre ? "kg lastre" : "kg"} × {s.reps || "-"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", padding: "16px 22px 20px", borderTop: `1px solid ${tk.border}` }}>
          <button
            onClick={onClose}
            className="feeg-press feeg-hover"
            style={{ flex: 1, padding: "12px", borderRadius: "12px", border: `1px solid ${tk.border}`, backgroundColor: "transparent", color: tk.text, fontWeight: 700, cursor: "pointer", "--feeg-hover-bg": tk.surfaceHover, "--feeg-press-scale": 0.96 }}
          >
            Cerrar
          </button>
          <button
            onClick={handleCopy}
            className={`feeg-press${justCopied ? " feeg-check-pulse" : ""}`}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: justCopied ? tk.accent : tk.accent,
              color: tk.onAccent,
              fontWeight: 800,
              cursor: "pointer",
              opacity: justCopied ? 0.9 : 1,
              "--feeg-press-scale": 0.96,
              "--feeg-pulse-color": tk.onAccent,
            }}
          >
            <Icon name={justCopied ? "check" : "download"} size={16} />
            {justCopied ? "Copiada a tus rutinas" : "Copiar a mis rutinas"}
          </button>
        </div>
      </div>
    </div>
  );
}
