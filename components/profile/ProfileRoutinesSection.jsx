import { getTokens } from "../../lib/tokens";
import ProfileRoutineCard from "./ProfileRoutineCard";

/**
 * Sección "Rutinas" del perfil ajeno: carrusel horizontal en vez de lista vertical — son pocas
 * por persona normalmente y así no compiten en altura con la lista de entrenamientos de debajo.
 * No se monta en el perfil propio (ahí las rutinas ya tienen su pantalla completa en /routines).
 */
export default function ProfileRoutinesSection({ isDark = true, routines, onOpenPreview, onCopyRoutine }) {
  const tk = getTokens(isDark);

  if (!routines || routines.length === 0) return null;

  return (
    <div id="profile-routines-section" style={{ marginBottom: "30px" }}>
      <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: "0 0 15px", color: tk.text, display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ width: "4px", height: "20px", backgroundColor: tk.accent, borderRadius: "2px" }}></span>
        Rutinas
      </h3>

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
    </div>
  );
}
