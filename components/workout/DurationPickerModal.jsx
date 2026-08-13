import { getWorkoutTokens } from "../../lib/tokens";
import NumberWheel from "../NumberWheel";

/**
 * Editor de la duración total del entreno — mismo patrón que RestTimePickerModal (overlay +
 * tarjeta + NumberWheel), pero con dos ruletas (horas y minutos) porque a diferencia del
 * descanso, una sesión larga sí puede pasar de la hora.
 */
export default function DurationPickerModal({ open, totalMinutes, onChange, onClose, t }) {
  const tk = getWorkoutTokens();
  const translate = t || ((s) => s);
  if (!open) return null;

  const safeTotal = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(safeTotal / 60);
  const minutes = safeTotal % 60;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2100,
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: tk.surface,
          borderRadius: tk.radius.lg,
          width: "300px",
          maxWidth: "100%",
          padding: "20px",
          textAlign: "center",
          border: `1px solid ${tk.border}`,
          boxSizing: "border-box",
        }}
      >
        <h3 style={{ color: tk.text, margin: "0 0 16px 0" }}>{translate("edit_duration_title")}</h3>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <div style={{ flex: 1 }}>
            <NumberWheel
              value={hours}
              onChange={(h) => onChange(h * 60 + minutes)}
              min={0}
              max={9}
              label=""
              formatLabel={(v) => `${v}h`}
              isDark
            />
          </div>
          <div style={{ flex: 1 }}>
            <NumberWheel
              value={minutes}
              onChange={(m) => onChange(hours * 60 + m)}
              min={0}
              max={59}
              step={1}
              label=""
              formatLabel={(v) => `${String(v).padStart(2, "0")}m`}
              isDark
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="feeg-surface feeg-press feeg-hover"
          style={{
            width: "100%",
            marginTop: "4px",
            padding: "12px",
            border: "none",
            borderRadius: tk.radius.md,
            fontWeight: "bold",
            cursor: "pointer",
            "--feeg-bg": tk.accent,
            "--feeg-fg": tk.onAccent,
            "--feeg-hover-bg": tk.accentHover,
            "--feeg-border-width": "0px",
          }}
        >
          {translate("done_label")}
        </button>
      </div>
    </div>
  );
}
