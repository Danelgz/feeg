/** Confirmación destructiva genérica del perfil (borrar entreno / borrar todos) — mismo look que antes, deduplicado. */
export default function ProfileConfirmModal({ open, title, message, confirmLabel, cancelLabel = "Cancelar", onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 3000, padding: "20px",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1a1a1a", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center" }}>
        <h2 style={{ color: "#fff", marginBottom: "15px" }}>{title}</h2>
        <p style={{ color: "#888", marginBottom: "25px" }}>{message}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #333", backgroundColor: "transparent", color: "#fff" }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#ff4757", color: "#fff", fontWeight: "bold" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
