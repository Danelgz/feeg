import { getTokens } from "../../lib/tokens";

/** Modal para crear una rutina nueva a partir de un entrenamiento completado. */
export default function ProfileAddToRoutineModal({ isDark = true, open, routineName, onChangeRoutineName, onConfirm, onClose }) {
  const tk = getTokens(isDark);
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 3500, padding: "20px",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: tk.surface, padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", border: `1px solid ${tk.border}` }}>
        <h2 style={{ color: tk.text, marginBottom: "15px" }}>Crear Rutina desde Entrenamiento</h2>
        <p style={{ color: tk.textMuted, marginBottom: "20px", fontSize: "0.9rem" }}>Ingresa un nombre para la nueva rutina</p>
        <input
          type="text"
          placeholder="Nombre de la rutina"
          value={routineName}
          onChange={(e) => onChangeRoutineName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") onConfirm();
          }}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: `1px solid ${tk.border}`,
            backgroundColor: tk.surfaceAlt,
            color: tk.text,
            marginBottom: "20px",
            fontSize: "1rem",
            boxSizing: "border-box",
          }}
          autoFocus
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1px solid ${tk.border}`, backgroundColor: "transparent", color: tk.text, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: tk.accent, color: tk.onAccent, fontWeight: "bold", cursor: "pointer" }}>
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
