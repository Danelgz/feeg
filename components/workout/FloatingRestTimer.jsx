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

const adjustBtnStyle = (tk) => ({
  background: "rgba(0,0,0,0.14)",
  border: "none",
  color: tk.onAccent,
  width: 32,
  height: 32,
  borderRadius: "50%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "transform 100ms ease, background-color 150ms ease",
});

const pressHandlers = {
  onMouseDown: (e) => (e.currentTarget.style.transform = "scale(0.9)"),
  onMouseUp: (e) => (e.currentTarget.style.transform = "scale(1)"),
  onMouseLeave: (e) => (e.currentTarget.style.transform = "scale(1)"),
};

/**
 * Pastilla flotante: mientras hay descanso activo muestra la cuenta atrás con +/-10s y cancelar;
 * si no, muestra el tiempo total transcurrido (siempre visible aunque se haga scroll más allá
 * de WorkoutStatsBar). No se muestra en absoluto si el entreno no está en curso.
 *
 * Los botones de ajuste usan un solo glifo (+/−) en vez de "+10"/"-10" — ese texto no cabía bien
 * en un círculo de 28px y se veía recortado/distorsionado.
 */
export default function FloatingRestTimer({ restActive, restRemainingSeconds, elapsedSeconds, onAdjust, onStop, t }) {
  const tk = getWorkoutTokens();
  const translate = t || ((s) => s);

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
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: tk.shadow.float,
        zIndex: 1500,
        boxSizing: "border-box",
      }}
    >
      {restActive ? (
        <>
          <button
            onClick={() => onAdjust(-10)}
            aria-label="-10s"
            title="-10s"
            style={adjustBtnStyle(tk)}
            {...pressHandlers}
          >
            <Icon name="minus" size={15} />
          </button>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "58px" }}>
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                opacity: 0.75,
                lineHeight: 1,
              }}
            >
              {translate("rest_prefix")}
            </span>
            <span style={{ fontWeight: 800, fontSize: "1.25rem", fontVariantNumeric: "tabular-nums", lineHeight: 1.25 }}>
              {formatMinSec(restRemainingSeconds)}
            </span>
          </div>

          <button
            onClick={() => onAdjust(10)}
            aria-label="+10s"
            title="+10s"
            style={adjustBtnStyle(tk)}
            {...pressHandlers}
          >
            <Icon name="plus" size={15} />
          </button>

          <div style={{ width: "1px", height: "26px", backgroundColor: "rgba(0,0,0,0.18)", flexShrink: 0 }} />

          <button
            onClick={onStop}
            aria-label={translate("close")}
            title={translate("close")}
            style={{
              background: "none",
              border: "none",
              color: tk.onAccent,
              width: 30,
              height: 30,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              opacity: 0.85,
              transition: "background-color 150ms ease, opacity 150ms ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.14)";
              e.currentTarget.style.opacity = 1;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.opacity = 0.85;
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 8px" }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              backgroundColor: tk.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="clock" size={15} color={tk.accent} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: tk.accent,
                lineHeight: 1,
              }}
            >
              {translate("total_time_label")}
            </span>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.25 }}>{formatElapsed(elapsedSeconds || 0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
