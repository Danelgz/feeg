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
  onBack,
  primaryLabel,
  onPrimaryAction,
  primaryDisabled,
}) {
  const tk = getWorkoutTokens();

  return (
    <div
      style={{
        padding: "15px 20px",
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
            style={{ background: "none", border: "none", color: tk.text, cursor: "pointer", display: "flex", flexShrink: 0 }}
          >
            <Icon name="chevronLeft" size={22} />
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
          <span style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </span>
        )}
      </div>

      {primaryLabel && (
        <button
          onClick={onPrimaryAction}
          disabled={primaryDisabled}
          style={{
            backgroundColor: tk.accent,
            color: tk.onAccent,
            border: "none",
            borderRadius: tk.radius.sm,
            padding: "8px 20px",
            fontSize: "1rem",
            fontWeight: 600,
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
