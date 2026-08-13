import { memo, useEffect, useRef, useState } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

function SeriesRow({
  serie,
  effectiveIndex,
  previous,
  rowRef,
  showRir = true,
  mode,
  weightUnit,
  onFieldChange,
  onRirChange,
  onToggleComplete,
  onOpenType,
  readOnly = false,
}) {
  const tk = getWorkoutTokens();
  const isPR = serie.isPR;
  const wasPRRef = useRef(isPR);
  const [justAchieved, setJustAchieved] = useState(false);
  const [showRecordHighlight, setShowRecordHighlight] = useState(false);
  const [glow, setGlow] = useState({ shadow: "0 0 0 rgba(46,230,197,0)", transition: "box-shadow 0s linear" });

  useEffect(() => {
    if (isPR && !wasPRRef.current) {
      wasPRRef.current = true;
      setJustAchieved(true);
      setShowRecordHighlight(true);
      const iconTimeout = setTimeout(() => setJustAchieved(false), 380);
      const highlightTimeout = setTimeout(() => setShowRecordHighlight(false), 2000);
      setGlow({ shadow: "0 0 22px rgba(46,230,197,0.45)", transition: "box-shadow 0s linear" });
      let raf2;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setGlow({ shadow: "0 0 0 rgba(46,230,197,0)", transition: "box-shadow 900ms ease-out" });
        });
      });
      return () => {
        clearTimeout(iconTimeout);
        clearTimeout(highlightTimeout);
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }
    wasPRRef.current = isPR;
  }, [isPR]);

  const badgeLabel = serie.type === "W" ? "W" : serie.type === "D" ? "D" : String(effectiveIndex);
  const badgeColor = serie.type === "W" ? tk.accent : serie.type === "D" ? tk.warning : tk.text;
  const previousLabel = previous ? `${previous.weight}${weightUnit} × ${previous.reps}` : "—";
  const fieldStyle = { width: "100%", alignSelf: "center", background: tk.surfaceAlt, borderRadius: "4px", color: tk.text, padding: "6px 0", textAlign: "center", fontSize: "1rem", boxSizing: "border-box" };

  return (
    <div
      className={`feeg-series-grid ${mode === "live" && showRir ? "feeg-series-grid--rir" : "feeg-series-grid--no-rir"}`}
      ref={rowRef}
      style={{
        display: "grid",
        alignItems: "center",
        minHeight: "45px",
        marginBottom: "5px",
        borderRadius: "8px",
        boxSizing: "border-box",
        padding: serie.completed ? "6px 8px" : "0",
        backgroundColor: serie.completed ? tk.accentSoft : "transparent",
        boxShadow: glow.shadow,
        transition: `background-color 400ms ease, ${glow.transition}`,
      }}
    >
      <div
        onClick={readOnly ? undefined : onOpenType}
        title={isPR ? "Récord personal" : undefined}
        style={{
          alignSelf: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          color: showRecordHighlight && !justAchieved ? tk.accent : badgeColor,
          fontWeight: "bold",
          fontSize: "1rem",
          backgroundColor: tk.surfaceAlt,
          borderRadius: "4px",
          border: showRecordHighlight ? `1.5px solid ${tk.accent}` : "1.5px solid transparent",
          padding: "4px 0",
          cursor: readOnly ? "default" : "pointer",
          userSelect: "none",
          transform: justAchieved ? "scale(1.15)" : "scale(1)",
          transition: "transform 380ms cubic-bezier(0.34,1.56,0.64,1), border-color 300ms ease, color 300ms ease",
        }}
      >
        {justAchieved ? <Icon name="trendUp" size={14} color={tk.accent} /> : badgeLabel}
      </div>

      <div style={{ alignSelf: "center", color: tk.textFaint, fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <div style={{ lineHeight: 1.15 }}>{previousLabel}</div>
      </div>

      {readOnly ? (
        <div style={fieldStyle}>{serie.weight === "" || serie.weight === undefined || serie.weight === null ? "—" : serie.weight}</div>
      ) : (
        <input
          aria-label="Peso de la serie"
          type="number"
          value={serie.weight}
          onChange={(e) => onFieldChange("weight", e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={previous ? String(previous.weight) : "0"}
          style={{ ...fieldStyle, border: "none", outlineColor: tk.accent }}
        />
      )}

      {readOnly ? (
        <div style={fieldStyle}>{serie.reps === "" || serie.reps === undefined || serie.reps === null ? "—" : serie.reps}</div>
      ) : (
        <input
          aria-label="Repeticiones de la serie"
          type="number"
          value={serie.reps}
          onChange={(e) => onFieldChange("reps", e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={previous ? String(previous.reps) : "0"}
          style={{ ...fieldStyle, border: "none", outlineColor: tk.accent }}
        />
      )}

      {mode === "live" && showRir && (readOnly ? (
        <div style={{ ...fieldStyle, color: serie.rir === "" || serie.rir === undefined ? tk.textFaint : tk.text, fontSize: "0.85rem" }}>
          {serie.rir === "" || serie.rir === undefined ? "—" : serie.rir}
        </div>
      ) : (
        <select
          aria-label="Repeticiones en reserva"
          value={serie.rir ?? ""}
          onChange={(e) => onRirChange?.(e.target.value === "" ? "" : Number(e.target.value))}
          style={{ ...fieldStyle, color: serie.rir === "" || serie.rir === undefined ? tk.textFaint : tk.text, fontSize: "0.85rem" }}
        >
          <option value="">—</option>
          {[0, 1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      ))}

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        {mode === "live" && readOnly ? (
          <div aria-label="Serie completada" style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${tk.accent}`, backgroundColor: tk.accent, color: tk.onAccent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={15} />
          </div>
        ) : mode === "live" ? (
          <button
            type="button"
            onClick={onToggleComplete}
            aria-label={serie.completed ? "Serie completada" : "Marcar serie como completada"}
            style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${serie.completed ? tk.accent : tk.border}`, backgroundColor: serie.completed ? tk.accent : "transparent", color: serie.completed ? tk.onAccent : tk.textFaint, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Icon name="check" size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default memo(SeriesRow);
