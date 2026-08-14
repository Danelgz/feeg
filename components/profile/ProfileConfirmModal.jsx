import { getTokens } from "../../lib/tokens";

/** Confirmación destructiva genérica del perfil (borrar entreno / borrar todos) — mismo look que antes, deduplicado. */
export default function ProfileConfirmModal({ isDark = true, open, title, message, confirmLabel, cancelLabel = "Cancelar", onConfirm, onCancel }) {
  const tk = getTokens(isDark);
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(4, 8, 8, 0.72)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 3000, padding: "20px",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap");`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: tk.surface,
          border: `1px solid ${tk.border}`,
          padding: "25px",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
          fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <h2 style={{ color: tk.text, marginBottom: "12px", fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h2>
        <p style={{ color: tk.textMuted, marginBottom: "25px", fontWeight: 500, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} className="feeg-press feeg-hover" style={{ flex: 1, padding: "12px", borderRadius: "12px", border: `1px solid ${tk.border}`, backgroundColor: "transparent", color: tk.text, fontWeight: 700, cursor: "pointer", "--feeg-hover-bg": tk.surfaceHover, "--feeg-press-scale": 0.96 }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="feeg-press" style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: tk.danger, color: "#fff", fontWeight: "800", cursor: "pointer", "--feeg-press-scale": 0.96 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
