import { memo, useEffect, useRef, useState } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

/**
 * Una fila de serie. Memoizada — con estado indexado por uid (no por posición), tocar una fila
 * no re-renderiza a sus hermanas ni al resto del ejercicio.
 *
 * `serie.isPR` es récord genuino (el reducer nunca lo pone a true para "primera vez que se
 * registra el ejercicio" — eso es `serie.isFirstEver`, que aquí no recibe ningún tratamiento
 * visual especial para no inflar la señal de "récord real").
 */
function SeriesRow({ serie, effectiveIndex, previous, mode, weightUnit, onFieldChange, onToggleComplete, onOpenType }) {
  const tk = getWorkoutTokens();
  const isPR = serie.isPR;
  const wasPRRef = useRef(isPR);
  const [justAchieved, setJustAchieved] = useState(false);
  // Aro + color de acento en el badge — dura 2s desde el logro y luego el badge vuelve a verse
  // como cualquier serie completada normal (la fila se queda verde igualmente, pero sin el aro).
  const [showRecordHighlight, setShowRecordHighlight] = useState(false);
  const [glow, setGlow] = useState({ shadow: "0 0 0 rgba(46,230,197,0)", transition: "box-shadow 0s linear" });

  // Cualquier serie completada tiñe la fila entera de verde claro (tk.accentSoft) — no solo el
  // botón de check. Al pasar de "no récord" a "récord" además: destello instantáneo del halo que
  // decae en 900ms (mismo patrón de doble rAF que PRToast) + el badge muestra el icono ~380ms
  // antes de volver a mostrar el número, con el anillo de acento visible solo 2s en total.
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

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 70px 70px 45px",
        gap: "10px",
        alignItems: "center",
        height: "45px",
        marginBottom: "5px",
        borderRadius: "8px",
        boxSizing: "border-box",
        padding: serie.completed ? "0 8px" : "0",
        backgroundColor: serie.completed ? tk.accentSoft : "transparent",
        boxShadow: glow.shadow,
        transition: `background-color 400ms ease, ${glow.transition}`,
      }}
    >
      <div
        onClick={onOpenType}
        title={isPR ? "Récord personal" : undefined}
        style={{
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
