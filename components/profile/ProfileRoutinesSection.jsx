import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";
import ProfileRoutineCard from "./ProfileRoutineCard";

/**
 * "Rutinas" y "Rangos" del perfil ajeno: dos filas dentro de UN único panel (mismo patrón que
 * ProfileInfoMenu — icono, etiqueta, chevron, separadas por una línea fina), no dos cajas sueltas
 * con su propio borde cada una. No se monta en el perfil propio (ahí las rutinas ya tienen su
 * pantalla completa en /routines, y "Rangos" vive en ProfileInfoMenu).
 *
 * Solo "Rutinas" se despliega de verdad (el carrusel aparece dentro del mismo panel, debajo de su
 * fila); "Rangos" es una fila más pero abre el modal — su chevron no rota porque no expande nada
 * aquí. Si esta persona no tiene ni rutinas ni rango calculado, la sección no se monta.
 *
 * routinesOpen/onToggleRoutines viven en la página (pages/user/[uid].js), no aquí: el botón
 * "Rutinas" de ProfileHeader necesita poder abrir esta fila Y hacer scroll hasta ella a la vez, y
 * no puede alcanzar un estado que viviera solo dentro de este componente.
 */
export default function ProfileRoutinesSection({ isDark = true, routines, onOpenPreview, onCopyRoutine, hasRankMap, onViewRankMap, routinesOpen, onToggleRoutines }) {
  const tk = getTokens(isDark);
  const hasRoutines = !!routines && routines.length > 0;

  if (!hasRoutines && !hasRankMap) return null;

  const rowStyle = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    backgroundColor: "transparent",
    color: tk.text,
    border: "none",
    fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
    fontSize: "0.95rem",
    fontWeight: "700",
    cursor: "pointer",
    textAlign: "left",
  };

  const iconStyle = { color: tk.accent, display: "flex", flexShrink: 0 };

  return (
    <div
      id="profile-routines-section"
      style={{
        marginBottom: "30px",
        border: `1px solid ${tk.border}`,
        borderRadius: "15px",
        overflow: "hidden",
        backgroundColor: tk.surfaceAlt,
      }}
    >
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&display=swap");`}</style>

      {hasRoutines && (
        <>
          <button
            onClick={onToggleRoutines}
            className="feeg-press feeg-hover"
            style={{
              ...rowStyle,
              borderBottom: routinesOpen || hasRankMap ? `1px solid ${tk.border}` : "none",
              "--feeg-hover-bg": tk.surfaceHover,
              "--feeg-press-scale": 0.98,
            }}
          >
            <span style={iconStyle}>
              <Icon name="dumbbell" size={18} />
            </span>
            <span style={{ flex: 1 }}>Rutinas</span>
            <Icon
              name="chevronRight"
              size={16}
              color={tk.textFaint}
              style={{ transform: routinesOpen ? "rotate(90deg)" : "none", transition: "transform 0.3s ease" }}
            />
          </button>

          {routinesOpen && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                overflowX: "auto",
                padding: "14px 16px",
                borderBottom: hasRankMap ? `1px solid ${tk.border}` : "none",
                animation: "fadeIn 0.3s ease",
              }}
            >
              {routines.map((routine) => (
                <ProfileRoutineCard
                  key={routine.id}
                  isDark={isDark}
                  routine={routine}
                  onOpenPreview={() => onOpenPreview(routine)}
                  onCopy={() => onCopyRoutine(routine)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {hasRankMap && (
        <button onClick={onViewRankMap} className="feeg-press feeg-hover" style={{ ...rowStyle, "--feeg-hover-bg": tk.surfaceHover, "--feeg-press-scale": 0.98 }}>
          <span style={iconStyle}>
            <Icon name="award" size={18} />
          </span>
          <span style={{ flex: 1 }}>Rangos</span>
          <Icon name="chevronRight" size={16} color={tk.textFaint} />
        </button>
      )}
    </div>
  );
}
