import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

/**
 * Menú "⋮" de un ejercicio. Solo expone onSubstitute/onDelete — construido así a propósito
 * para que el bug de producción de [id].js (llamaba a setters que no existían) sea imposible
 * de reintroducir por diseño: no hay ningún otro sitio donde "inventarse" una acción nueva.
 */
export default function ExerciseActionsMenu({ open, onToggle, onSubstitute, onDelete }) {
  const tk = getWorkoutTokens();

  return (
    <div style={{ position: "relative" }}>
      <button onClick={onToggle} style={{ background: "none", border: "none", color: tk.text, cursor: "pointer", display: "flex" }}>
        <Icon name="moreVertical" size={20} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "30px",
            right: 0,
            backgroundColor: tk.surfaceAlt,
            border: `1px solid ${tk.border}`,
            borderRadius: tk.radius.sm,
            boxShadow: tk.shadow.float,
            zIndex: 100,
            width: "170px",
            overflow: "hidden",
          }}
        >
          <button
            onClick={onSubstitute}
            style={{
              width: "100%",
              padding: "12px",
              background: "none",
              border: "none",
              borderBottom: `1px solid ${tk.border}`,
              color: tk.text,
              textAlign: "left",
              cursor: "pointer",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Icon name="edit" size={15} />
            Sustituir ejercicio
          </button>
          <button
            onClick={onDelete}
            style={{
              width: "100%",
              padding: "12px",
              background: "none",
              border: "none",
              color: tk.danger,
              textAlign: "left",
              cursor: "pointer",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Icon name="trash" size={15} />
            Eliminar ejercicio
          </button>
        </div>
      )}
    </div>
  );
}
