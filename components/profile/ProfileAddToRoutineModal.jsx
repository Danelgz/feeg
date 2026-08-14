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
        backgroundColor: "rgba(4, 8, 8, 0.72)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 3500, padding: "20px",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap");`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: tk.surface,
          padding: "25px",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
          border: `1px solid ${tk.border}`,
          fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <h2 style={{ color: tk.text, marginBottom: "12px", fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Crear Rutina desde Entrenamiento</h2>
        <p style={{ color: tk.textMuted, marginBottom: "20px", fontSize: "0.9rem", fontWeight: 500 }}>Ingresa un nombre para la nueva rutina</p>
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
            borderRadius: "10px",
            border: `1px solid ${tk.border}`,
            backgroundColor: tk.surfaceAlt,
            color: tk.text,
            marginBottom: "20px",
            fontSize: "1rem",
            fontFamily: "inherit",
            fontWeight: 600,
            boxSizing: "border-box",
          }}
          autoFocus
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} className="feeg-press feeg-hover" style={{ flex: 1, padding: "12px", borderRadius: "12px", border: `1px solid ${tk.border}`, backgroundColor: "transparent", color: tk.text, fontWeight: 700, cursor: "pointer", "--feeg-hover-bg": tk.surfaceHover, "--feeg-press-scale": 0.96 }}>
            Cancelar
          </button>
          <button onClick={onConfirm} className="feeg-press" style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: tk.accent, color: tk.onAccent, fontWeight: "800", cursor: "pointer", "--feeg-press-scale": 0.96 }}>
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
