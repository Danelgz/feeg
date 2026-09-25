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
  onFillPrevious,
  onOpenType,
  readOnly = false,
}) {
  const tk = getWorkoutTokens();
  const isPR = !readOnly && serie.isPR;
  const wasPRRef = useRef(isPR);
  const [justAchieved, setJustAchieved] = useState(false);
  const [showRecordHighlight, setShowRecordHighlight] = useState(false);
  const [glow, setGlow] = useState({ shadow: "0 0 0 rgba(46,230,197,0)", transition: "box-shadow 0s linear" });

  // Pulso en el botón de check al completar una serie — no al montar ya completada (sesión
  // restaurada) ni al desmarcarla, solo en la transición real false→true del usuario.
  const wasCompletedRef = useRef(serie.completed);
  const [checkPulse, setCheckPulse] = useState(false);
  useEffect(() => {
    if (!readOnly && serie.completed && !wasCompletedRef.current) {
      setCheckPulse(true);
      const timeout = setTimeout(() => setCheckPulse(false), 550);
      wasCompletedRef.current = serie.completed;
      return () => clearTimeout(timeout);
    }
    wasCompletedRef.current = serie.completed;
  }, [serie.completed, readOnly]);

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
  const badgeColor = readOnly ? tk.text : serie.type === "W" ? tk.accent : serie.type === "D" ? tk.warning : tk.text;
  const previousLabel = previous ? `${previous.weight}${weightUnit} × ${previous.reps}` : "—";
  // Campos de 38px de alto y cifras en negrita: son lo que se toca con el pulgar entre series, con
  // el pulso alto. En una serie completada el fondo del campo se funde con la fila verde.
  const fieldStyle = {
    width: "100%", height: 38, alignSelf: "center", background: serie.completed && !readOnly ? "rgba(0,0,0,0.22)" : tk.surfaceAlt, borderRadius: "9px", color: tk.text,
    padding: "0", textAlign: "center", fontSize: "1.02rem", fontWeight: 700, boxSizing: "border-box", fontVariantNumeric: "tabular-nums",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const selectAll = (e) => e.target.select();

  return (
    <div
      className={`feeg-series-grid ${readOnly ? (showRir ? "feeg-series-grid--readonly-rir" : "feeg-series-grid--readonly") : mode === "live" && showRir ? "feeg-series-grid--rir" : "feeg-series-grid--no-rir"}`}
      ref={rowRef}
      style={{
        display: "grid",
        alignItems: "center",
        minHeight: "46px",
        marginBottom: "4px",
        borderRadius: "12px",
        boxSizing: "border-box",
        // Mismo padding completada o no: antes la fila "saltaba" 8px a los lados al marcarla.
        padding: readOnly ? "0" : "4px 6px",
        backgroundColor: readOnly ? "transparent" : serie.completed ? tk.accentSoft : "transparent",
        boxShadow: readOnly ? "none" : glow.shadow,
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
          backgroundColor: "transparent",
          height: 32,
          borderRadius: "8px",
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

      {!readOnly && (
        // Tocar la marca anterior la copia en la serie: repetir lo de la semana pasada es un toque.
        <button
          type="button"
          onClick={previous && onFillPrevious ? onFillPrevious : undefined}
          disabled={!previous || serie.completed}
          aria-label={previous ? `Copiar serie anterior: ${previousLabel}` : undefined}
          style={{ alignSelf: "center", textAlign: "left", background: "none", border: "none", padding: 0, color: tk.textFaint, fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: previous && !serie.completed ? "pointer" : "default", fontVariantNumeric: "tabular-nums" }}
        >
          {previousLabel}
        </button>
      )}

      {readOnly ? (
        <div style={fieldStyle}>{serie.weight === "" || serie.weight === undefined || serie.weight === null ? "—" : serie.weight}</div>
      ) : (
        <input
          aria-label="Peso de la serie"
          type="number"
          inputMode="decimal"
          onFocus={selectAll}
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
          inputMode="numeric"
          onFocus={selectAll}
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
          style={{ ...fieldStyle, border: "none", appearance: "none", WebkitAppearance: "none", textAlignLast: "center", color: serie.rir === "" || serie.rir === undefined ? tk.textFaint : tk.text, fontSize: "0.9rem" }}
        >
          <option value="">—</option>
          {[0, 1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      ))}

      {!readOnly && <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        {mode === "live" ? (
          <button
            type="button"
            onClick={onToggleComplete}
            aria-label={serie.completed ? "Serie completada" : "Marcar serie como completada"}
            className={checkPulse ? "feeg-check-pulse" : undefined}
            style={{
              position: "relative",
              width: 34, height: 34, borderRadius: "10px", border: "none", backgroundColor: serie.completed ? tk.accent : tk.surfaceAlt, color: serie.completed ? tk.onAccent : tk.textFaint, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              "--feeg-pulse-color": tk.accent,
            }}
          >
            <Icon name="check" size={17} strokeWidth={2.6} />
          </button>
        ) : null}
      </div>}
    </div>
  );
}

export default memo(SeriesRow);
