import { getWorkoutTokens } from "../../lib/tokens";
import { useUser } from "../../context/UserContext";
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
  backgroundColor: tk.surfaceAlt,
  border: "none",
  color: tk.text,
  padding: "10px 16px",
  borderRadius: tk.radius.pill,
  cursor: "pointer",
  fontSize: "0.95rem",
  fontWeight: 700,
  flexShrink: 0,
  transition: "transform 100ms ease, background-color 150ms ease",
});

const pressHandlers = {
  onMouseDown: (e) => (e.currentTarget.style.transform = "scale(0.94)"),
  onMouseUp: (e) => (e.currentTarget.style.transform = "scale(1)"),
  onMouseLeave: (e) => (e.currentTarget.style.transform = "scale(1)"),
};

/**
 * Barra de descanso a todo lo ancho, fija en la parte inferior de la pantalla (mismo lenguaje
 * visual que apps de referencia como Hevy, con los colores propios de FEEG). Sustituye la pastilla
 * flotante anterior — más legible, botones más fáciles de acertar con el pulgar, y una barra de
 * progreso real (no solo el número) que se vuelve ámbar en los últimos 5s como aviso.
 */
export default function FloatingRestTimer({
  restActive,
  restRemainingSeconds,
  totalRestSeconds,
  elapsedSeconds,
  onAdjust,
  onStop,
  t,
}) {
  const tk = getWorkoutTokens();
  const { isMobile } = useUser();
  const translate = t || ((s) => s);

  const progress =
    restActive && totalRestSeconds > 0
      ? Math.min(1, Math.max(0, (totalRestSeconds - restRemainingSeconds) / totalRestSeconds))
      : 0;
  const isFinalStretch = restActive && restRemainingSeconds > 0 && restRemainingSeconds <= 5;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: isMobile ? 0 : "230px",
        right: 0,
        zIndex: 1500,
      }}
    >
      {restActive && (
        <div style={{ height: "3px", backgroundColor: tk.surfaceAlt }}>
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              backgroundColor: isFinalStretch ? tk.warning : tk.accent,
              transition: "width 1s linear, background-color 400ms ease",
            }}
          />
        </div>
      )}

      <div
        style={{
          backgroundColor: tk.surface,
          borderTop: `1px solid ${tk.border}`,
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          alignItems: "center",
          justifyContent: restActive ? "space-between" : "center",
          gap: "10px",
          boxShadow: tk.shadow.float,
          boxSizing: "border-box",
        }}
      >
        {restActive ? (
          <>
            <button onClick={() => onAdjust(-10)} style={adjustBtnStyle(tk)} {...pressHandlers}>
              −10
            </button>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: tk.accent,
                  lineHeight: 1,
                  marginBottom: "3px",
                }}
              >
                {translate("rest_prefix")}
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "1.9rem",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                  color: tk.text,
                  display: "inline-block",
                  transform: isFinalStretch ? "scale(1.08)" : "scale(1)",
                  transition: "transform 300ms ease",
                }}
              >
                {formatMinSec(restRemainingSeconds)}
              </span>
            </div>

            <button onClick={() => onAdjust(10)} style={adjustBtnStyle(tk)} {...pressHandlers}>
              +10
            </button>

            <button
              onClick={onStop}
              style={{
                backgroundColor: tk.accent,
                color: tk.onAccent,
                border: "none",
                borderRadius: tk.radius.pill,
                padding: "10px 20px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                flexShrink: 0,
                transition: "transform 100ms ease",
              }}
              {...pressHandlers}
            >
              {translate("skip_rest")}
            </button>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                backgroundColor: tk.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="clock" size={13} color={tk.accent} />
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: tk.accent,
              }}
            >
              {translate("total_time_label")}
            </span>
            <span style={{ fontWeight: 800, fontSize: "1rem", color: tk.text }}>{formatElapsed(elapsedSeconds || 0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
