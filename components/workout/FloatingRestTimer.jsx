import { getWorkoutTokens } from "../../lib/tokens";
import { useUser } from "../../context/UserContext";
import { Icon } from "../ui";
import { BOTTOM_NAV_HEIGHT } from "../BottomNavigation";

function formatMinSec(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const RING_SIZE = 46;
const RING_STROKE = 3.5;
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
 * Descanso entre series: una tarjeta flotante sobre la barra de navegación, sólo mientras se
 * descansa. Anillo y barra superior de progreso que se vuelven ámbar en los últimos 5 s, la cuenta
 * atrás grande y los ajustes de ±10 s al alcance del pulgar.
 */
export default function FloatingRestTimer({
  restActive,
  restRemainingSeconds,
  totalRestSeconds,
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

  // Sin descanso en marcha no se pinta nada: la barra fija con el "tiempo total" repetía el
  // cronómetro que ya está arriba y se comía ~80px de la pantalla durante todo el entreno.
  if (!restActive) return null;

  const smallBtn = {
    width: 42,
    height: 42,
    borderRadius: 12,
    border: "none",
    background: tk.surfaceAlt,
    color: tk.text,
    fontWeight: 800,
    fontSize: "0.85rem",
    cursor: "pointer",
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`${translate("rest_prefix")}: ${formatMinSec(restRemainingSeconds)}`}
      style={{
        position: "fixed",
        // En móvil la barra de pestañas sigue visible durante el entreno (para poder salir a
        // mirar otra cosa sin cerrarlo), así que el temporizador flota ENCIMA de ella.
        bottom: isMobile ? `calc(${BOTTOM_NAV_HEIGHT + 8}px + env(safe-area-inset-bottom, 0px))` : 16,
        left: isMobile ? 10 : "calc(230px + 16px)",
        right: isMobile ? 10 : 16,
        zIndex: 1500,
        animation: "feeg-rest-in 260ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          maxWidth: 560,
          margin: "0 auto",
          backgroundColor: tk.surface,
          borderRadius: 20,
          padding: "10px 10px 10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
          boxSizing: "border-box",
        }}
      >
        {/* Progreso también como barra en el borde superior: se lee de reojo sin mirar el número. */}
        <span aria-hidden style={{ position: "absolute", left: 0, top: 0, height: 3, width: `${progress * 100}%`, background: isFinalStretch ? tk.warning : tk.accent, transition: "width 1s linear" }} />

        <div style={{ position: "relative", width: RING_SIZE, height: RING_SIZE, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <RestRing progress={progress} color={isFinalStretch ? tk.warning : tk.accent} trackColor={tk.surfaceAlt} />
          <Icon name="timer" size={18} color={isFinalStretch ? tk.warning : tk.accent} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: tk.textFaint }}>{translate("rest_prefix")}</div>
          <div
            style={{
              fontWeight: 900,
              fontSize: "1.5rem",
              lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
              color: isFinalStretch ? tk.warning : tk.text,
              letterSpacing: "-0.02em",
            }}
          >
            {formatMinSec(restRemainingSeconds)}
          </div>
        </div>

        <button onClick={() => onAdjust(-10)} aria-label="Quitar 10 segundos" className="feeg-press" style={smallBtn}>
          −10
        </button>
        <button onClick={() => onAdjust(10)} aria-label="Añadir 10 segundos" className="feeg-press" style={smallBtn}>
          +10
        </button>
        <button
          onClick={onStop}
          className="feeg-press"
          style={{ height: 42, padding: "0 16px", borderRadius: 12, border: "none", background: tk.accent, color: tk.onAccent, fontWeight: 800, fontSize: "0.88rem", cursor: "pointer", flexShrink: 0 }}
        >
          {translate("skip_rest")}
        </button>
      </div>
      <style>{`
        @keyframes feeg-rest-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { [role="timer"] { animation: none !important; } }
      `}</style>
    </div>
  );
}
