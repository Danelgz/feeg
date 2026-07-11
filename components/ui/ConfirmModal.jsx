import { getTokens } from "../../lib/tokens";
import Button from "./Button";

export default function ConfirmModal({
  isDark,
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}) {
  const tk = getTokens(isDark);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: tk.surface,
          borderRadius: tk.radius.lg,
          padding: "24px",
          maxWidth: "400px",
          width: "100%",
          boxShadow: tk.shadow.float,
          border: `1px solid ${tk.border}`,
        }}
      >
        {title && <h3 style={{ margin: 0, color: tk.text, fontSize: "1.15rem", fontWeight: 700 }}>{title}</h3>}
        {description && (
          <p style={{ margin: "10px 0 0", color: tk.textMuted, fontSize: "0.9rem", lineHeight: 1.5 }}>{description}</p>
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "22px", justifyContent: "flex-end" }}>
          <Button isDark variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button isDark variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
