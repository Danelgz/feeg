import ProfileWorkoutCard from "./ProfileWorkoutCard";
import { Button, Spinner } from "../ui";

/**
 * Sección "Entrenamientos" del perfil: cabecera con borrar-todo + lista ordenada de tarjetas.
 * onAddToRoutine/onDeleteWorkout/onEditWorkout/onDeleteAll son opcionales — se omiten al ver el
 * perfil de otra persona, y entonces las tarjetas solo muestran "Ver detalles". hasMore/onLoadMore
 * son opcionales también, para el perfil público que pagina contra Firestore (el propio no lo
 * necesita: su historial ya está sincronizado localmente entero).
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
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "4px", height: "20px", backgroundColor: "#1dd1a1", borderRadius: "2px" }}></span>
          Entrenamientos
        </h3>
        {completedWorkouts?.length > 0 && onDeleteAll && (
          <button
            onClick={onDeleteAll}
            style={{
              backgroundColor: "transparent",
              color: "#ff4757",
              border: "1px solid #ff4757",
              borderRadius: "8px",
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#ff4757";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#ff4757";
            }}
          >
            {t("delete_all")}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {!completedWorkouts || completedWorkouts.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", backgroundColor: "#1a1a1a", borderRadius: "12px", color: "#666" }}>
            No hay entrenamientos registrados aún.
          </div>
        ) : (
          [...completedWorkouts]
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
            .map((workout) => (
              <ProfileWorkoutCard
                key={workout.id}
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
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0 0" }}>
          <Button isDark={isDark} variant="secondary" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? <Spinner isDark={isDark} size={16} /> : "Cargar más"}
          </Button>
        </div>
      )}
    </>
  );
}
