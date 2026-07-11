import { memo } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

/**
 * Una fila de serie. Memoizada — con estado indexado por uid (no por posición), tocar una fila
 * no re-renderiza a sus hermanas ni al resto del ejercicio.
 */
function SeriesRow({ serie, effectiveIndex, previous, mode, weightUnit, onFieldChange, onToggleComplete, onOpenType }) {
  const tk = getWorkoutTokens();
  const badgeLabel = serie.type === "W" ? "W" : serie.type === "D" ? "D" : String(effectiveIndex);
  const badgeColor = serie.type === "W" ? tk.accent : serie.type === "D" ? tk.warning : tk.text;
  const previousLabel = previous ? `${previous.weight}${weightUnit} × ${previous.reps}` : "—";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 70px 70px 45px",
        gap: "10px",
        alignItems: "center",
        height: "45px",
        marginBottom: "5px",
      }}
    >
      <div
        onClick={onOpenType}
        style={{
          color: badgeColor,
          fontWeight: "bold",
          fontSize: "1rem",
          backgroundColor: tk.surfaceAlt,
          borderRadius: "4px",
          textAlign: "center",
          padding: "4px 0",
          cursor: "pointer",
          userSelect: "none",
          position: "relative",
        }}
      >
        {badgeLabel}
        {serie.isPR && (
          <span style={{ position: "absolute", top: "-8px", right: "-6px", fontSize: "0.75rem" }} title="Récord personal">
            🏆
          </span>
        )}
      </div>

      <div
        style={{
          color: tk.textFaint,
          fontSize: "0.85rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {previousLabel}
      </div>

      <input
        type="number"
        value={serie.weight}
        onChange={(e) => onFieldChange("weight", e.target.value === "" ? "" : Number(e.target.value))}
        placeholder={previous ? String(previous.weight) : "0"}
        style={{
          width: "100%",
          background: tk.surfaceAlt,
          border: "none",
          borderRadius: "4px",
          color: tk.text,
          padding: "6px 0",
          textAlign: "center",
          fontSize: "1rem",
        }}
      />

      <input
        type="number"
        value={serie.reps}
        onChange={(e) => onFieldChange("reps", e.target.value === "" ? "" : Number(e.target.value))}
        placeholder={previous ? String(previous.reps) : "0"}
        style={{
          width: "100%",
          background: tk.surfaceAlt,
          border: "none",
          borderRadius: "4px",
          color: tk.text,
          padding: "6px 0",
          textAlign: "center",
          fontSize: "1rem",
        }}
      />

      <div style={{ display: "flex", justifyContent: "center" }}>
        {mode === "live" ? (
          <button
            onClick={onToggleComplete}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1.5px solid ${serie.completed ? tk.accent : tk.border}`,
              backgroundColor: serie.completed ? tk.accent : "transparent",
              color: serie.completed ? tk.onAccent : tk.textFaint,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="check" size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default memo(SeriesRow);
