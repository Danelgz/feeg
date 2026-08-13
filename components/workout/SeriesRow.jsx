import { memo, useEffect, useRef, useState } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

/**
 * Una fila de serie. La recomendación ya no vive como un placeholder: cada serie tiene un objetivo
 * visible, el contexto de la sesión anterior y una acción directa para aplicarlo.
 */
function SeriesRow({
  serie,
  effectiveIndex,
  previous,
  rowRef,
  recommendation,
  recommendationLabel,
  recommendationActionLabel,
  onApplyRecommendation,
  mode,
  weightUnit,
  onFieldChange,
  onRirChange,
  onToggleComplete,
  onOpenType,
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
  const recommendationTarget = recommendation
    ? `${recommendation.weight !== null && recommendation.weight !== undefined ? `${recommendation.weight}${weightUnit}` : ""}${recommendation.reps !== null && recommendation.reps !== undefined ? ` × ${recommendation.reps}` : ""}`.trim()
    : "";

  const recommendationColor = recommendation?.decision === "decrease" ? tk.warning : recommendation?.decision === "maintain" ? tk.textMuted : tk.accent;
  const recommendationBackground = recommendation?.decision === "decrease" ? tk.warningSoft : recommendation?.decision === "maintain" ? "rgba(255,255,255,0.06)" : tk.accentSoft;
  return (
    <div
      ref={rowRef}
      style={{
        display: "grid",
        gridTemplateColumns: mode === "live" ? "40px minmax(92px, 1fr) 62px 62px 52px 38px" : "40px 1fr 70px 70px 45px",
        gap: "10px",
        alignItems: recommendation ? "stretch" : "center",
        minHeight: recommendation ? "58px" : "45px",
        marginBottom: "5px",
        borderRadius: "8px",
        boxSizing: "border-box",
        padding: serie.completed ? "6px 8px" : recommendation ? "6px 0" : "0",
        backgroundColor: serie.completed ? tk.accentSoft : "transparent",
        boxShadow: glow.shadow,
        transition: `background-color 400ms ease, ${glow.transition}`,
      }}
    >
      <div
        onClick={onOpenType}
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
          cursor: "pointer",
          userSelect: "none",
          transform: justAchieved ? "scale(1.15)" : "scale(1)",
          transition: "transform 380ms cubic-bezier(0.34,1.56,0.64,1), border-color 300ms ease, color 300ms ease",
        }}
      >
        {justAchieved ? <Icon name="trendUp" size={14} color={tk.accent} /> : badgeLabel}
      </div>

      <div style={{ alignSelf: "center", color: tk.textFaint, fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <div style={{ lineHeight: 1.15 }}>{previousLabel}</div>
        {recommendation && (
          <div
            title="Sugerencia basada en tu último entrenamiento"
            style={{ display: "flex", alignItems: "center", gap: "5px", width: "fit-content", maxWidth: "100%", color: recommendationColor, background: recommendationBackground, border: `1px solid ${recommendationColor}55`, borderRadius: "7px", padding: "4px 5px 4px 6px", fontSize: "0.64rem", marginTop: "4px", whiteSpace: "nowrap", boxSizing: "border-box" }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{recommendation.decision === "increase" ? "↑" : recommendation.decision === "decrease" ? "↓" : "→"} {recommendationLabel}: <strong>{recommendationTarget}</strong></span>
            {mode === "live" && !serie.completed && onApplyRecommendation && (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onApplyRecommendation(); }}
                style={{ border: "none", borderLeft: `1px solid ${recommendationColor}55`, padding: "0 0 0 5px", background: "transparent", color: recommendationColor, fontSize: "0.62rem", fontWeight: 800, cursor: "pointer" }}
              >
                {recommendationActionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      <input
        aria-label="Peso de la serie"
        type="number"
        value={serie.weight}
        onChange={(e) => onFieldChange("weight", e.target.value === "" ? "" : Number(e.target.value))}
        placeholder={recommendation?.weight !== null && recommendation?.weight !== undefined ? String(recommendation.weight) : previous ? String(previous.weight) : "0"}
        style={{ width: "100%", alignSelf: "center", background: recommendation ? recommendationBackground : tk.surfaceAlt, border: recommendation ? `1px solid ${recommendationColor}66` : "none", borderRadius: "4px", color: tk.text, padding: "6px 0", textAlign: "center", fontSize: "1rem", boxSizing: "border-box", outlineColor: tk.accent }}
      />

      <input
        aria-label="Repeticiones de la serie"
        type="number"
        value={serie.reps}
        onChange={(e) => onFieldChange("reps", e.target.value === "" ? "" : Number(e.target.value))}
        placeholder={recommendation?.reps !== null && recommendation?.reps !== undefined ? String(recommendation.reps) : previous ? String(previous.reps) : "0"}
        style={{ width: "100%", alignSelf: "center", background: recommendation ? recommendationBackground : tk.surfaceAlt, border: recommendation ? `1px solid ${recommendationColor}66` : "none", borderRadius: "4px", color: tk.text, padding: "6px 0", textAlign: "center", fontSize: "1rem", boxSizing: "border-box", outlineColor: tk.accent }}
      />

      {mode === "live" && (
        <select
          aria-label="Repeticiones en reserva"
          value={serie.rir ?? ""}
          onChange={(e) => onRirChange?.(e.target.value === "" ? "" : Number(e.target.value))}
          style={{ width: "100%", alignSelf: "center", background: tk.surfaceAlt, border: "none", borderRadius: "4px", color: serie.rir === "" || serie.rir === undefined ? tk.textFaint : tk.text, padding: "6px 0", textAlign: "center", fontSize: "0.85rem" }}
        >
          <option value="">—</option>
          {[0, 1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      )}

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        {mode === "live" ? (
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
