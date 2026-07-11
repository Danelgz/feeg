import { getWorkoutTokens } from "../../lib/tokens";
import NumberWheel from "../NumberWheel";

function formatRestLabel(totalSeconds) {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m${seconds}s`;
}

/** Editor de tiempo de descanso — reutiliza NumberWheel (antes existía sin usar en el flujo). */
export default function RestTimePickerModal({ open, value, onChange, onClose, t }) {
  const tk = getWorkoutTokens();
  const translate = t || ((s) => s);
  if (!open) return null;

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
      }}
    >
      <div
        style={{
          backgroundColor: tk.surface,
          borderRadius: tk.radius.lg,
          width: "280px",
          padding: "20px",
          textAlign: "center",
          border: `1px solid ${tk.border}`,
        }}
      >
        <h3 style={{ color: tk.text, margin: "0 0 16px 0" }}>{translate("edit_rest_title")}</h3>

        <NumberWheel value={value} onChange={onChange} min={5} max={600} step={5} label="" formatLabel={formatRestLabel} isDark />

        <button
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: "4px",
            padding: "12px",
            backgroundColor: tk.surfaceAlt,
            color: tk.text,
            border: "none",
            borderRadius: tk.radius.md,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {translate("close")}
        </button>
      </div>
    </div>
  );
}
