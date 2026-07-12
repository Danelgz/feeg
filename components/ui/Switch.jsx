import { getTokens } from "../../lib/tokens";

/** Interruptor on/off reutilizable — mismo lenguaje visual que el resto de components/ui. */
export default function Switch({ isDark, checked, onChange, disabled = false }) {
  const tk = getTokens(isDark);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: "46px",
        height: "26px",
        borderRadius: tk.radius.pill,
        border: "none",
        padding: "3px",
        backgroundColor: checked ? tk.accent : tk.surfaceHover,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: tk.transition,
        display: "flex",
        justifyContent: checked ? "flex-end" : "flex-start",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          width: "20px",
          height: "20px",
          borderRadius: tk.radius.full,
          backgroundColor: checked ? tk.onAccent : tk.textMuted,
          transition: tk.transition,
        }}
      />
    </button>
  );
}
