import { useEffect, useRef } from "react";
import { getTokens } from "../../lib/tokens";
import ProfileWorkoutCard from "./ProfileWorkoutCard";
import { Spinner } from "../ui";

/**
 * Sección "Entrenamientos" del perfil: cabecera con borrar-todo + lista ordenada de tarjetas.
 * onAddToRoutine/onDeleteWorkout/onEditWorkout/onDeleteAll son opcionales — se omiten al ver el
 * perfil de otra persona, y entonces las tarjetas solo muestran "Ver detalles". hasMore/onLoadMore
 * son opcionales también, para el perfil público que pagina contra Firestore (el propio no lo
 * necesita: su historial ya está sincronizado localmente entero).
 *
 * La siguiente página se pide sola al acercarse al final de la lista (IntersectionObserver sobre
 * un centinela tras la última tarjeta), no con un botón "Cargar más" que había que ir a buscar.
 */
export default function ProfileWorkoutsSection({
  completedWorkouts,
  onOpenDetail,
  onAddToRoutine,
  onDeleteWorkout,
  onEditWorkout,
  onDeleteAll,
  hasMore,
  onLoadMore,
  isLoadingMore,
  currentUserId,
  onToggleLike,
  onAddComment,
  isDark = true,
  t,
}) {
  const tk = getTokens(isDark);
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || !onLoadMore) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      // 200px de margen: pide la siguiente página un poco antes de que el centinela entre en
      // pantalla, para que las tarjetas nuevas ya estén ahí cuando el dedo llega abajo del todo.
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, completedWorkouts?.length]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, color: tk.text, display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "4px", height: "20px", backgroundColor: tk.accent, borderRadius: "2px" }}></span>
          Entrenamientos
        </h3>
        {completedWorkouts?.length > 0 && onDeleteAll && (
          <button
            onClick={onDeleteAll}
            style={{
              backgroundColor: "transparent",
              color: tk.danger,
              border: `1px solid ${tk.danger}`,
              borderRadius: "8px",
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = tk.danger;
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = tk.danger;
            }}
          >
            {t("delete_all")}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {!completedWorkouts || completedWorkouts.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", backgroundColor: tk.surfaceAlt, borderRadius: "12px", color: tk.textMuted }}>
            No hay entrenamientos registrados aún.
          </div>
        ) : (
          [...completedWorkouts]
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
            .map((workout) => (
              <ProfileWorkoutCard
                key={workout.id}
                isDark={isDark}
                workout={workout}
                onOpenDetail={() => onOpenDetail(workout)}
                onAddToRoutine={onAddToRoutine ? () => onAddToRoutine(workout.id) : undefined}
                onDelete={onDeleteWorkout ? () => onDeleteWorkout(workout.id) : undefined}
                onEdit={onEditWorkout ? () => onEditWorkout(workout) : undefined}
                liked={!!(currentUserId && workout.likes?.includes(currentUserId))}
                onToggleLike={onToggleLike ? () => onToggleLike(workout.id) : undefined}
                onAddComment={onAddComment ? (text) => onAddComment(workout.id, text) : undefined}
                t={t}
              />
            ))
        )}
      </div>

      {hasMore && (
        <div ref={sentinelRef} style={{ display: "flex", justifyContent: "center", padding: "20px 0 0" }}>
          {isLoadingMore && <Spinner isDark={isDark} size={16} />}
        </div>
      )}
    </>
  );
}
