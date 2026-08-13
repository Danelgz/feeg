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

const RING_SIZE = 60;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Anillo de progreso del descanso, dibujado alrededor del número de cuenta atrás — de un vistazo
 *  se lee "cuánto queda" por la forma del anillo, sin tener que leer el número. Sustituye a la
 *  barra horizontal de 3px que iba arriba de toda la pantalla: fácil de no ver, y desconectada del
 *  número al que se refería. */
function RestRing({ progress, color, trackColor }) {
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
      aria-hidden="true"
    >
      <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke={trackColor} strokeWidth={RING_STROKE} />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s linear, stroke 400ms ease" }}
      />
    </svg>
  );
}

/**
 * Barra de descanso a todo lo ancho, fija en la parte inferior de la pantalla (mismo lenguaje
 * visual que apps de referencia como Hevy, con los colores propios de FEEG). Sustituye la pastilla
 * flotante anterior — más legible, botones más fáciles de acertar con el pulgar, y un anillo de
 * progreso real alrededor del número (no solo el número) que se vuelve ámbar en los últimos 5s
 * como aviso.
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

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0, gap: "4px" }}>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: tk.accent,
                  lineHeight: 1,
                }}
              >
                {translate("rest_prefix")}
              </span>
              <div style={{ position: "relative", width: RING_SIZE, height: RING_SIZE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <RestRing progress={progress} color={isFinalStretch ? tk.warning : tk.accent} trackColor={tk.surfaceAlt} />
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "1.05rem",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                    color: tk.text,
                    display: "inline-block",
                    transform: isFinalStretch ? "scale(1.1)" : "scale(1)",
                    transition: "transform 300ms ease",
                  }}
                >
                  {formatMinSec(restRemainingSeconds)}
                </span>
              </div>
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
