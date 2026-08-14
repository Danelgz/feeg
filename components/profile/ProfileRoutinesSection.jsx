import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";
import ProfileRoutineCard from "./ProfileRoutineCard";

/**
 * "Rutinas" y "Rangos" del perfil ajeno: dos cajas desplegables con el mismo estilo que
 * ProfileInfoMenu ("Información" en el perfil propio) — icono en cuadrado de acento, etiqueta,
 * chevron a la derecha — en vez del carrusel suelto con un botón de texto plano que había antes.
 * No se monta en el perfil propio (ahí las rutinas ya tienen su pantalla completa en /routines, y
 * "Rangos" vive en ProfileInfoMenu).
 *
 * Solo "Rutinas" se despliega de verdad (el carrusel aparece debajo al abrir la caja); "Rangos"
 * usa la misma caja pero abre el modal — su chevron no rota porque no expande nada aquí, lleva a
 * otro sitio. Si esta persona no tiene ni rutinas ni rango calculado, la sección no se monta.
 *
 * routinesOpen/onToggleRoutines viven en la página (pages/user/[uid].js), no aquí: el botón
 * "Rutinas" de ProfileHeader necesita poder abrir esta caja Y hacer scroll hasta ella a la vez,
 * y no puede alcanzar un estado que viviera solo dentro de este componente.
 */
export default function ProfileRoutinesSection({ isDark = true, routines, onOpenPreview, onCopyRoutine, hasRankMap, onViewRankMap, routinesOpen, onToggleRoutines }) {
  const tk = getTokens(isDark);
  const hasRoutines = !!routines && routines.length > 0;

  if (!hasRoutines && !hasRankMap) return null;

  const boxStyle = (active) => ({
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    backgroundColor: tk.surfaceAlt,
    color: tk.text,
    border: `1px solid ${active ? tk.accent : tk.border}`,
    borderRadius: "15px",
    fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
    fontSize: "1.05rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: active ? tk.shadow.accent : "none",
  });

  const iconBoxStyle = {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    backgroundColor: tk.accentSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: tk.accent,
    flexShrink: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "30px" }}>
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&display=swap");`}</style>

      {hasRoutines && (
        <div id="profile-routines-section">
          <button onClick={onToggleRoutines} className="feeg-press" style={boxStyle(routinesOpen)}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={iconBoxStyle}>
                <Icon name="dumbbell" size={18} />
              </div>
              Rutinas
            </div>
            <Icon
              name="chevronRight"
              size={18}
              color={tk.accent}
              style={{ transform: routinesOpen ? "rotate(90deg)" : "none", transition: "transform 0.3s ease" }}
            />
          </button>

          {routinesOpen && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                overflowX: "auto",
                marginTop: "12px",
                paddingBottom: "6px",
                marginInline: "-2px",
                paddingInline: "2px",
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
        </div>
      )}

      {hasRankMap && (
        <button onClick={onViewRankMap} className="feeg-press" style={boxStyle(false)}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={iconBoxStyle}>
              <Icon name="award" size={18} />
            </div>
            Rangos
          </div>
          <Icon name="chevronRight" size={18} color={tk.textFaint} />
        </button>
      )}
    </div>
  );
}
