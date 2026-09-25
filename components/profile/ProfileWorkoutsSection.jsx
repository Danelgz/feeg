import { useEffect, useRef } from "react";
import { getTokens } from "../../lib/tokens";
import ProfileWorkoutCard from "./ProfileWorkoutCard";
import { Spinner } from "../ui";

/**
 * Pestaña "Entrenos" del perfil: publicaciones ordenadas de la más reciente, con borrar-todo al final.
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
  onAddPhoto,
  language,
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

  const sorted = [...(completedWorkouts || [])].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  return (
    <>
      {sorted.length === 0 ? (
        <div style={{ padding: "36px 12px", textAlign: "center", color: tk.textMuted, fontSize: "0.9rem" }}>
          No hay entrenamientos registrados aún.
        </div>
      ) : (
        <div style={{ borderBottom: `1px solid ${tk.hairline}` }}>
          {sorted.map((workout) => (
            <ProfileWorkoutCard
              key={workout.id}
              isDark={isDark}
              workout={workout}
              language={language}
              onOpenDetail={() => onOpenDetail(workout)}
              onAddToRoutine={onAddToRoutine ? () => onAddToRoutine(workout.id) : undefined}
              onDelete={onDeleteWorkout ? () => onDeleteWorkout(workout.id) : undefined}
              onEdit={onEditWorkout ? () => onEditWorkout(workout) : undefined}
              onAddPhoto={onAddPhoto ? () => onAddPhoto(workout) : undefined}
              liked={!!(currentUserId && workout.likes?.includes(currentUserId))}
              onToggleLike={onToggleLike ? () => onToggleLike(workout.id) : undefined}
              onAddComment={onAddComment ? (text) => onAddComment(workout.id, text) : undefined}
              t={t}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} style={{ display: "flex", justifyContent: "center", padding: "20px 0 0" }}>
          {isLoadingMore && <Spinner isDark={isDark} size={16} />}
        </div>
      )}

      {sorted.length > 0 && onDeleteAll && (
        <button
          onClick={onDeleteAll}
          className="feeg-press"
          style={{ display: "block", margin: "18px auto 0", background: "none", border: "none", color: tk.danger, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", padding: 8 }}
        >
          {t("delete_all")}
        </button>
      )}
    </>
  );
}
