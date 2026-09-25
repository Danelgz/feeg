import { useState } from "react";
import { getTokens } from "../../lib/tokens";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { Icon } from "../ui";
import { ExerciseThumb } from "../workout";
import WorkoutPhoto from "../workout/WorkoutPhoto";
import ProfileWorkoutSocial from "./ProfileWorkoutSocial";

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const day = 86400000;
  if (diff < 3600000) return `hace ${Math.max(1, Math.round(diff / 60000))} min`;
  if (diff < day) return `hace ${Math.round(diff / 3600000)} h`;
  if (diff < 2 * day) return "ayer";
  if (diff < 7 * day) return `hace ${Math.floor(diff / day)} días`;
  return new Date(date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: new Date(date).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

function durationLabel(w) {
  const min = w.elapsedTime !== undefined && w.elapsedTime !== null ? Math.round(Number(w.elapsedTime) / 60) : Number(w.totalTime || 0);
  if (!min) return "—";
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

/**
 * Un entreno en el perfil, con forma de publicación: título y cuándo, la foto si la tiene, tres
 * cifras, los ejercicios principales y la nota. Sin caja con fondo: las publicaciones se separan
 * con una línea fina, como en el feed.
 *
 * Las acciones del menú son todas opcionales: en el perfil propio se pasan (foto, rutina, editar,
 * borrar); en el ajeno no, y en su lugar van like y comentarios.
 */
export default function ProfileWorkoutCard({
  isDark = true,
  workout,
  onOpenDetail,
  onAddToRoutine,
  onDelete,
  onEdit,
  onAddPhoto,
  liked,
  onToggleLike,
  onAddComment,
  language,
  t,
}) {
  const tk = getTokens(isDark);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenu = !!(onAddToRoutine || onEdit || onDelete || onAddPhoto);
  const exercises = workout.exerciseDetails || workout.details || [];

  const menuItems = [
    onAddPhoto && { key: "photo", label: workout.photoURL ? "Cambiar foto" : "Añadir foto", icon: "camera", run: onAddPhoto },
    onAddToRoutine && { key: "routine", label: "Guardar como rutina", icon: "plus", run: onAddToRoutine },
    onEdit && { key: "edit", label: "Editar", icon: "edit", run: onEdit },
    onDelete && { key: "delete", label: "Borrar", icon: "trash", run: onDelete, danger: true },
  ].filter(Boolean);

  const stats = [
    { label: "Duración", value: durationLabel(workout) },
    { label: "Volumen", value: `${Math.round(Number(workout.totalVolume) || 0).toLocaleString("es-ES")} kg` },
    { label: "Series", value: workout.series || 0 },
  ];

  return (
    <article style={{ padding: "16px 0", borderTop: `1px solid ${tk.hairline}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <button type="button" onClick={onOpenDetail} style={{ minWidth: 0, flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: tk.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
            {workout.name || "Entreno"}
          </div>
          <div style={{ fontSize: "0.76rem", fontWeight: 600, color: tk.textFaint, marginTop: 2 }}>{timeAgo(workout.completedAt)}</div>
        </button>

        {hasMenu && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Más acciones"
              aria-expanded={menuOpen}
              className="feeg-press"
              style={{ background: "none", border: "none", borderRadius: 10, width: 34, height: 34, display: "grid", placeItems: "center", color: tk.textMuted, cursor: "pointer" }}
            >
              <Icon name="moreHorizontal" size={19} />
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
                <div role="menu" style={{ position: "absolute", top: 38, right: 0, background: tk.surface, borderRadius: 14, boxShadow: tk.shadow.float, zIndex: 100, width: 200, overflow: "hidden", padding: 4 }}>
                  {menuItems.map((item) => (
                    <button
                      key={item.key}
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        item.run();
                      }}
                      style={{ width: "100%", padding: "11px 12px", background: "none", border: "none", borderRadius: 10, color: item.danger ? tk.danger : tk.text, textAlign: "left", cursor: "pointer", fontSize: "0.88rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <Icon name={item.icon} size={15} color={item.danger ? tk.danger : tk.textMuted} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {workout.photoURL && (
        <div style={{ marginTop: 12 }}>
          <WorkoutPhoto url={workout.photoURL} alt={`Foto de ${workout.name || "entreno"}`} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 12 }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: "0.68rem", color: tk.textFaint, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: "0.98rem", color: tk.text, fontWeight: 800, marginTop: 1, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {exercises.length > 0 && (
        <button type="button" onClick={onOpenDetail} style={{ display: "block", width: "100%", marginTop: 12, padding: 0, background: "none", border: "none", textAlign: "left", cursor: "pointer" }}>
          {exercises.slice(0, 3).map((ex, i) => (
            <div key={`${ex.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
              <ExerciseThumb name={ex.name} size={30} />
              <span style={{ flex: 1, minWidth: 0, fontSize: "0.86rem", color: tk.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: tk.textFaint, fontWeight: 700 }}>{(ex.series || []).length}× </span>
                {translateExerciseName(ex.name, language)}
              </span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: "0.8rem", color: tk.accent, fontWeight: 700 }}>
            {exercises.length > 3 ? `Ver los ${exercises.length} ejercicios` : "Ver entreno"} <Icon name="chevronRight" size={13} />
          </div>
        </button>
      )}

      {workout.comments && (
        <p style={{ margin: "10px 0 0", fontSize: "0.88rem", color: tk.textMuted, lineHeight: 1.45, overflowWrap: "anywhere" }}>“{workout.comments}”</p>
      )}

      {onToggleLike && (
        <ProfileWorkoutSocial
          isDark={isDark}
          liked={liked}
          likesCount={workout.likes?.length}
          comments={workout.commentsList}
          onToggleLike={onToggleLike}
          onAddComment={onAddComment}
          t={t}
        />
      )}
    </article>
  );
}
