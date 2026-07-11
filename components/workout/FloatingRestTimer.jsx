import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

function formatMinSec(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

/**
 * Pastilla flotante: mientras hay descanso activo muestra la cuenta atrás con +/-10s y cancelar;
 * si no, muestra el tiempo total transcurrido (siempre visible aunque se haga scroll más allá
 * de WorkoutStatsBar). No se muestra en absoluto si el entreno no está en curso.
 */
export default function FloatingRestTimer({ restActive, restRemainingSeconds, elapsedSeconds, onAdjust, onStop }) {
  const tk = getWorkoutTokens();

  return (
    <div
      style={{
        position: "fixed",
        bottom: "90px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: restActive ? tk.accent : tk.surface,
        color: restActive ? tk.onAccent : tk.text,
        border: restActive ? "none" : `1.5px solid ${tk.accent}`,
        borderRadius: tk.radius.pill,
        padding: restActive ? "10px 12px 10px 20px" : "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: tk.shadow.float,
        zIndex: 1500,
        minWidth: "180px",
        justifyContent: "center",
      }}
    >
      {restActive ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", opacity: 0.75 }}>Descanso</span>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", fontVariantNumeric: "tabular-nums" }}>
              {formatMinSec(restRemainingSeconds)}
            </span>
          </div>
          <button
            onClick={() => onAdjust(-10)}
            style={{ background: "rgba(0,0,0,0.15)", border: "none", color: tk.onAccent, width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}
          >
            −10
          </button>
          <button
            onClick={() => onAdjust(10)}
            style={{ background: "rgba(0,0,0,0.15)", border: "none", color: tk.onAccent, width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}
          >
            +10
          </button>
          <button onClick={onStop} style={{ background: "none", border: "none", color: tk.onAccent, cursor: "pointer", display: "flex" }}>
            <Icon name="close" size={18} />
          </button>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", color: tk.accent }}>Tiempo Total</span>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>{formatElapsed(elapsedSeconds || 0)}</span>
        </div>
      )}
    </div>
  );
}
