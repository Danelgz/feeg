import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

/**
 * Cabecera sticky compartida por create.js (mode="template", nombre editable) y
 * empty.js/[id].js (mode="live", título fijo + botón de volver).
 */
export default function WorkoutHeader({
  mode = "live",
  name,
  onNameChange,
  namePlaceholder,
  title,
  subtitle,
  onBack,
  primaryLabel,
  onPrimaryAction,
  primaryDisabled,
}) {
  const tk = getWorkoutTokens();

  return (
    <div
      style={{
        padding: "12px 16px",
        gap: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: tk.bg,
        position: "sticky",
        top: 0,
        zIndex: 1002,
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Volver"
            className="feeg-press"
            style={{ width: 38, height: 38, borderRadius: 12, background: tk.surfaceAlt, border: "none", color: tk.text, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}
          >
            <Icon name="chevronLeft" size={20} />
          </button>
        )}
        {mode === "template" ? (
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange?.(e.target.value)}
            placeholder={namePlaceholder}
            style={{
              background: "none",
              border: "none",
              color: tk.accent,
              fontSize: "1.2rem",
              fontWeight: 600,
              width: "100%",
              outline: "none",
            }}
          />
        ) : (
          <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
            <span style={{ color: tk.text, fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </span>
            {subtitle && (
              <span style={{ color: tk.textMuted, fontSize: "0.78rem", fontWeight: 600, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</span>
            )}
          </span>
        )}
      </div>

      {primaryLabel && (
        <button
          onClick={onPrimaryAction}
          disabled={primaryDisabled}
          className="feeg-press"
          style={{
            backgroundColor: tk.accent,
            color: tk.onAccent,
            border: "none",
            borderRadius: 12,
            height: 38,
            padding: "0 18px",
            fontSize: "0.95rem",
            fontWeight: 800,
            cursor: primaryDisabled ? "not-allowed" : "pointer",
            opacity: primaryDisabled ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          {primaryLabel}
        </button>
      )}
    </div>
  );
}
