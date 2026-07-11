import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

const TYPES = [
  { key: "N", label: "Normal", desc: "Serie estándar de trabajo" },
  { key: "W", label: "Calentamiento", desc: "No cuenta para el volumen total ni los récords" },
  { key: "D", label: "Drop Set", desc: "Reducción de peso sin descanso" },
];

/** Selector de tipo de serie (N/W/D) + eliminar esta serie (con confirmación en el padre). */
export default function SeriesTypeModal({ open, currentType, onSelectType, onRequestDelete, onClose }) {
  const tk = getWorkoutTokens();
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: tk.surface,
          borderRadius: tk.radius.lg,
          padding: "24px",
          width: "300px",
          maxWidth: "90vw",
          border: `1px solid ${tk.border}`,
          boxShadow: tk.shadow.float,
        }}
      >
        <h3 style={{ color: tk.text, margin: "0 0 6px 0", fontSize: "1.1rem" }}>Tipo de serie</h3>
        <p style={{ color: tk.textFaint, fontSize: "0.8rem", marginBottom: "20px", marginTop: 0 }}>
          Selecciona el tipo para esta serie
        </p>

        {TYPES.map(({ key, label, desc }) => {
          const isSelected = currentType === key;
          const color = key === "W" ? tk.accent : key === "D" ? tk.warning : tk.text;
          return (
            <button
              key={key}
              onClick={() => onSelectType(key)}
              style={{
                width: "100%",
                padding: "14px 16px",
                backgroundColor: isSelected ? tk.accentSoft : tk.surfaceAlt,
                border: `1px solid ${isSelected ? tk.accent : tk.border}`,
                borderRadius: tk.radius.md,
                color,
                cursor: "pointer",
                marginBottom: "10px",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: tk.transition,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{key} — {label}</div>
                <div style={{ color: tk.textFaint, fontSize: "0.78rem", marginTop: "2px" }}>{desc}</div>
              </div>
              {isSelected && <Icon name="check" size={18} color={tk.accent} />}
            </button>
          );
        })}

        {onRequestDelete && (
          <button
            onClick={onRequestDelete}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: tk.dangerSoft,
              color: tk.danger,
              border: "none",
              borderRadius: tk.radius.md,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Icon name="trash" size={15} />
            Eliminar esta serie
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: "4px",
            padding: "12px",
            backgroundColor: tk.surfaceAlt,
            color: tk.textMuted,
            border: "none",
            borderRadius: tk.radius.md,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
