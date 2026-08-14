import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";
import ProfileRoutineCard from "./ProfileRoutineCard";

/**
 * Sección "Rutinas" del perfil ajeno: carrusel horizontal en vez de lista vertical — son pocas
 * por persona normalmente y así no compiten en altura con la lista de entrenamientos de debajo.
 * No se monta en el perfil propio (ahí las rutinas ya tienen su pantalla completa en /routines).
 *
 * También aloja la entrada a "Rangos" (hasRankMap/onViewRankMap) junto al título — antes vivía
 * como insignia suelta en la cabecera y competía con el nombre; aquí queda debajo de la
 * descripción, agrupada con lo otro que se puede ver del perfil de alguien. Si esta persona no
 * tiene rutinas pero sí rango calculado, la sección igualmente se monta solo para dar acceso a
 * "Rangos" — solo desaparece del todo si no hay ni lo uno ni lo otro.
 */
export default function ProfileRoutinesSection({ isDark = true, routines, onOpenPreview, onCopyRoutine, hasRankMap, onViewRankMap }) {
  const tk = getTokens(isDark);
  const hasRoutines = !!routines && routines.length > 0;

  if (!hasRoutines && !hasRankMap) return null;

  return (
    <div id="profile-routines-section" style={{ marginBottom: "30px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "15px" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, color: tk.text, display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "4px", height: "20px", backgroundColor: tk.accent, borderRadius: "2px" }}></span>
          Rutinas
        </h3>
        {hasRankMap && (
          <button
            onClick={onViewRankMap}
            className="feeg-press feeg-hover"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
              padding: "7px 12px",
              borderRadius: "10px",
              border: `1px solid ${tk.border}`,
              backgroundColor: "transparent",
              color: tk.text,
              fontWeight: "700",
              fontSize: "0.8rem",
              cursor: "pointer",
              "--feeg-hover-bg": tk.surfaceHover,
              "--feeg-press-scale": 0.95,
            }}
          >
            <Icon name="award" size={14} />
            Rangos
          </button>
        )}
      </div>

      {hasRoutines && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            paddingBottom: "6px",
            marginInline: "-2px",
            paddingInline: "2px",
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
  );
}
