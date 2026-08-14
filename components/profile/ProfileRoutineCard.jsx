import { useState } from "react";
import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";

/**
 * Tarjeta de una rutina ajena, dentro del carrusel de ProfileRoutinesSection. Dos acciones:
 * tocar la tarjeta abre la vista previa de ejercicios (onOpenPreview, ver
 * ProfileRoutinePreviewModal), y el botón de abajo la copia directamente a "Mis rutinas" sin
 * salir del perfil (onCopy). El propio botón da el feedback de éxito (icono + pulso) en vez de
 * depender solo del toast global, que es fácil de perderse si se han copiado varias seguidas.
 */
export default function ProfileRoutineCard({ isDark = true, routine, onOpenPreview, onCopy }) {
  const tk = getTokens(isDark);
  const [justCopied, setJustCopied] = useState(false);

  const seriesCount = routine.exercises.reduce((sum, ex) => sum + (ex.series?.length || 0), 0);
  const groups = [...new Set(routine.exercises.map((ex) => ex.group).filter(Boolean))];

  const handleCopy = (event) => {
    event.stopPropagation();
    if (justCopied) return;
    onCopy();
    setJustCopied(true);
    window.setTimeout(() => setJustCopied(false), 1600);
  };

  return (
    <button
      onClick={onOpenPreview}
      className="feeg-press feeg-hover feeg-lift"
      style={{
        flex: "0 0 auto",
        width: "230px",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        borderRadius: tk.radius.lg,
        border: `1px solid ${tk.border}`,
        backgroundColor: tk.surfaceAlt,
        cursor: "pointer",
        fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
        "--feeg-hover-border": tk.accent,
        "--feeg-press-scale": 0.97,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: tk.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {routine.name}
        </div>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: tk.textMuted, marginTop: "3px" }}>
          {routine.exercises.length} ejercicios · {seriesCount} series
        </div>
      </div>

      {groups.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {groups.slice(0, 3).map((group) => (
            <span
              key={group}
              style={{
                padding: "3px 9px",
                borderRadius: tk.radius.pill,
                backgroundColor: tk.surface,
                border: `1px solid ${tk.border}`,
                color: tk.textMuted,
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              {group}
            </span>
          ))}
          {groups.length > 3 && (
            <span style={{ padding: "3px 9px", color: tk.textFaint, fontSize: "0.68rem", fontWeight: 700 }}>
              +{groups.length - 3}
            </span>
          )}
        </div>
      )}

      <div
        onClick={handleCopy}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") handleCopy(event);
        }}
        className={`feeg-press${justCopied ? " feeg-check-pulse" : ""}`}
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "9px",
          borderRadius: tk.radius.sm,
          backgroundColor: justCopied ? tk.accent : tk.accentSoft,
          color: justCopied ? tk.onAccent : tk.accent,
          fontSize: "0.82rem",
          fontWeight: 700,
          cursor: "pointer",
          "--feeg-press-scale": 0.95,
          "--feeg-pulse-color": tk.accent,
        }}
      >
        <Icon name={justCopied ? "check" : "download"} size={15} />
        {justCopied ? "Copiada" : "Copiar a mis rutinas"}
      </div>
    </button>
  );
}
