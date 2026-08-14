// pages/exercises.js
import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { exercisesList } from "../data/exercises";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { translateExerciseName } from "../lib/exerciseTranslation";
import { Icon, EmptyState, PageHeader, Badge, MuscleGroupIcon } from "../components/ui";
import { ExerciseThumb } from "../components/workout";

// Orden de la rejilla de grupos: el de data/exercises.js con Abductor y Cardio intercambiados de
// sitio (a petición expresa) — Abductor tiene foto de músculo real ahora (ver MuscleGroupIcon) y
// gana el hueco más visible; Cardio, que solo tiene icono genérico, pasa al suyo. Cualquier grupo
// que no esté en esta lista (por si se añade uno nuevo a exercisesList y se olvida aquí) cae al
// final en vez de desaparecer.
const GROUP_DISPLAY_ORDER = [
  "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Antebrazo", "Cuádriceps", "Femoral",
  "Glúteos", "Gemelos", "Cuello", "Abdomen", "Abductor", "Aductor", "Cardio", "Cuerpo Completo", "Movilidad",
];

function exerciseTypeLabel(exercise, t) {
  if (exercise.unit === "lastre") return t("exercise_type_lastre");
  if (exercise.type === "reps") return t("exercise_type_reps");
  if (exercise.type === "time") return t("exercise_type_time");
  return t("exercise_type_weight_reps");
}

export default function Exercises() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  // Un solo grupo activo, no un mapa de expandidos: tocar un grupo lleva directamente a sus
  // ejercicios (sustituyendo la rejilla), no los despliega debajo de ella.
  const [selectedGroup, setSelectedGroup] = useState(null);
  const { theme, isMobile, t, language, favoriteExercises, toggleFavoriteExercise } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  // Filtra ejercicios por búsqueda y los agrupa por grupo muscular
  const filteredGroups = Object.entries(exercisesList).reduce((acc, [group, exercises]) => {
    const filtered = exercises.filter((ex) =>
      ex.name.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[group] = filtered;
    }
    return acc;
  }, {});

  const hasResults = Object.keys(filteredGroups).length > 0;
  const selectedExercises = selectedGroup ? filteredGroups[selectedGroup] : null;
  const orderedGroups = [
    ...GROUP_DISPLAY_ORDER.filter((g) => filteredGroups[g]),
    ...Object.keys(filteredGroups).filter((g) => !GROUP_DISPLAY_ORDER.includes(g)),
  ];

  return (
    <Layout>
      <PageHeader isDark={isDark} isMobile={isMobile} title={t("exercises")} />

      <div style={{ position: "relative", maxWidth: "900px", marginBottom: "20px" }}>
        <Icon name="search" size={17} color={tk.textFaint} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="text"
          placeholder={t("search_exercise")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "12px 12px 12px 40px",
            width: "100%",
            borderRadius: tk.radius.sm,
            border: `1.5px solid ${tk.border}`,
            backgroundColor: tk.surface,
            color: tk.text,
            fontSize: "1rem",
            transition: tk.transition,
            boxSizing: "border-box"
          }}
          onFocus={(e) => e.target.style.borderColor = tk.accent}
          onBlur={(e) => e.target.style.borderColor = tk.border}
        />
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {selectedGroup ? (
          <div>
            <button
              onClick={() => setSelectedGroup(null)}
              className="feeg-surface feeg-press feeg-hover"
              style={{
                border: "none",
                fontSize: "0.95rem",
                cursor: "pointer",
                fontWeight: "700",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 0",
                "--feeg-fg": tk.accent,
                "--feeg-hover-fg": tk.accentHover,
                "--feeg-border-width": "0px",
                "--feeg-press-scale": 0.96,
              }}
            >
              <Icon name="chevronLeft" size={18} />
              Grupos musculares
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              <MuscleGroupIcon group={selectedGroup} isDark={isDark} size={56} />
              <h2 style={{ margin: 0, color: tk.text, fontSize: "1.3rem", fontWeight: 800 }}>{t(selectedGroup) || selectedGroup}</h2>
            </div>

            {!selectedExercises || selectedExercises.length === 0 ? (
              <EmptyState isDark={isDark} icon="search" title={t("no_exercises_found")} />
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {selectedExercises.map((exercise) => {
                  const isFavorite = favoriteExercises.includes(exercise.name);
                  return (
                    <li
                      key={exercise.id}
                      onClick={() => router.push(`/exercise-history?exercise=${encodeURIComponent(exercise.name)}`)}
                      style={{
                        padding: "12px",
                        border: `1px solid ${tk.border}`,
                        borderRadius: tk.radius.sm,
                        marginBottom: "8px",
                        cursor: "pointer",
                        backgroundColor: tk.surface,
                        color: tk.text,
                        transition: tk.transition,
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = tk.surfaceHover;
                        e.currentTarget.style.borderColor = tk.accent;
                        e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = tk.surface;
                        e.currentTarget.style.borderColor = tk.border;
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                          <ExerciseThumb name={exercise.name} size={34} />
                          {translateExerciseName(exercise.name, language)}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <Badge isDark={isDark} variant="neutral">{exerciseTypeLabel(exercise, t)}</Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavoriteExercise(exercise.name);
                            }}
                            aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                            aria-pressed={isFavorite}
                            className="feeg-press"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: isFavorite ? tk.danger : tk.textFaint,
                              display: "flex",
                              padding: "2px",
                              "--feeg-press-scale": 0.85,
                            }}
                          >
                            <Icon name="heart" size={17} style={{ fill: isFavorite ? "currentColor" : "none" }} />
                          </button>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : hasResults ? (
          // Rejilla de grupos: icono del cuerpo con solo ese músculo marcado en verde + nombre
          // debajo, 2 por fila — se reconoce el grupo de un vistazo sin tener que leer cada
          // etiqueta, y tocarlo lleva directamente a sus ejercicios.
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: isMobile ? "12px" : "16px" }}>
            {orderedGroups.map((group) => (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                className="feeg-press feeg-hover"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  padding: isMobile ? "18px 10px" : "24px 14px",
                  borderRadius: tk.radius.md,
                  border: `1px solid ${tk.border}`,
                  backgroundColor: tk.surface,
                  cursor: "pointer",
                  "--feeg-hover-border": tk.accent,
                  "--feeg-hover-bg": tk.surfaceHover,
                  "--feeg-press-scale": 0.97,
                }}
              >
                <MuscleGroupIcon group={group} isDark={isDark} size={isMobile ? 100 : 128} />
                <span
                  style={{
                    color: tk.text,
                    fontSize: isMobile ? "0.85rem" : "0.95rem",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    textAlign: "center",
                  }}
                >
                  {t(group) || group}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState isDark={isDark} icon="search" title={t("no_exercises_found")} />
        )}
      </div>
    </Layout>
  );
}
