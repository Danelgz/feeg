import { useState } from "react";
import { Icon } from "../ui";
import ProfileWorkoutSocial from "./ProfileWorkoutSocial";

/**
 * Tarjeta de un entrenamiento completado en la lista de perfil. Las acciones del menú "⋮" son
 * todas opcionales: en el perfil propio se pasan las tres (añadir a rutina/editar/borrar); en el
 * perfil de otra persona no se pasa ninguna y el botón "⋮" directamente no se muestra — solo
 * queda "Ver detalles", que es lo único que tiene sentido sobre un entreno ajeno.
 *
 * Like/comentarios (onToggleLike/onAddComment) son opcionales por la misma razón: el perfil
 * propio no los monta (no tiene sentido darte like a ti mismo), el perfil de otra persona sí.
 */
export default function ProfileWorkoutCard({
  workout,
  onOpenDetail,
  onAddToRoutine,
  onDelete,
  onEdit,
  liked,
  onToggleLike,
  onAddComment,
  t,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenu = !!(onAddToRoutine || onEdit || onDelete);

  return (
    <div style={{ backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "14px", marginBottom: "15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "10px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#1dd1a1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {workout.name}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#888" }}>{new Date(workout.completedAt).toLocaleString()}</div>
        </div>

        {hasMenu && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Más acciones"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: "10px",
                width: "34px",
                height: "34px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ccc",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
            >
              <Icon name="moreVertical" size={18} />
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
                <div
                  style={{
                    position: "absolute",
                    top: "40px",
                    right: 0,
                    backgroundColor: "#242424",
                    border: "1px solid #333",
                    borderRadius: "12px",
                    boxShadow: "0 8px 25px rgba(0,0,0,0.5)",
                    zIndex: 100,
                    width: "190px",
                    overflow: "hidden",
                  }}
                >
                  {onAddToRoutine && (
                    <button
                      onClick={() => { setMenuOpen(false); onAddToRoutine(); }}
                      style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", borderBottom: "1px solid #333", color: "#fff", textAlign: "left", cursor: "pointer", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "10px" }}
                    >
                      <Icon name="plus" size={15} color="#2EE6C5" />
                      Añadir a rutina
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(); }}
                      style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", borderBottom: "1px solid #333", color: "#fff", textAlign: "left", cursor: "pointer", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "10px" }}
                    >
                      <Icon name="edit" size={15} color="#aaa" />
                      Editar
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(); }}
                      style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", color: "#ff4757", textAlign: "left", cursor: "pointer", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "10px" }}
                    >
                      <Icon name="trash" size={15} />
                      Borrar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "14px" }}>
        {workout.series} series • {workout.totalVolume?.toLocaleString()} kg • {workout.totalReps} reps • {workout.totalTime || Math.floor((workout.elapsedTime || 0) / 60)} min
      </div>

      <button
        onClick={onOpenDetail}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          backgroundColor: "rgba(29, 209, 161, 0.12)",
          border: "1px solid rgba(29, 209, 161, 0.3)",
          borderRadius: "10px",
          padding: "10px",
          cursor: "pointer",
          color: "#1dd1a1",
          fontSize: "0.85rem",
          fontWeight: "700",
          transition: "all 0.2s ease",
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(29, 209, 161, 0.2)")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(29, 209, 161, 0.12)")}
      >
        <Icon name="list" size={16} />
        Ver detalles
      </button>

      {onToggleLike && (
        <ProfileWorkoutSocial
          liked={liked}
          likesCount={workout.likes?.length}
          comments={workout.commentsList}
          onToggleLike={onToggleLike}
          onAddComment={onAddComment}
          t={t}
        />
      )}
    </div>
  );
}
