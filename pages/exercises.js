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

function exerciseTypeLabel(exercise, t) {
  if (exercise.unit === "lastre") return t("exercise_type_lastre");
  if (exercise.type === "reps") return t("exercise_type_reps");
  if (exercise.type === "time") return t("exercise_type_time");
  return t("exercise_type_weight_reps");
}

export default function Exercises() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
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

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

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
        {hasResults ? (
          <>
            {/* Grid de grupos: icono del cuerpo con solo ese músculo marcado en verde + nombre
                debajo, en vez de una fila de texto plano — se reconoce el grupo de un vistazo sin
                tener que leer cada etiqueta. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "84px" : "100px"}, 1fr))`,
                gap: isMobile ? "10px" : "14px",
                marginBottom: "28px",
              }}
            >
              {Object.keys(filteredGroups).map((group) => {
                const isOpen = !!expandedGroups[group];
                return (
                  <button
                    key={group}
                    id={`group-${group}`}
                    onClick={() => toggleGroup(group)}
                    aria-pressed={isOpen}
                    className="feeg-press feeg-hover"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 8px",
                      borderRadius: tk.radius.md,
                      border: `1px solid ${isOpen ? tk.accent : tk.border}`,
                      backgroundColor: isOpen ? tk.accentSoft : tk.surface,
                      cursor: "pointer",
                      "--feeg-hover-border": tk.accent,
                      "--feeg-press-scale": 0.96,
                    }}
                  >
                    <MuscleGroupIcon group={group} isDark={isDark} size={isMobile ? 56 : 64} />
                    <span
                      style={{
                        color: isOpen ? tk.accent : tk.text,
                        fontSize: "0.7rem",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                        textAlign: "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                      }}
                    >
                      {t(group) || group}
                    </span>
                  </button>
                );
              })}
            </div>

            {Object.entries(filteredGroups).map(([group, exercises]) => expandedGroups[group] && (
              <div key={group} style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ margin: "0 0 10px", color: tk.text, fontSize: "1rem", fontWeight: 800 }}>{t(group) || group}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {exercises.map((exercise) => {
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
                          marginLeft: "1rem"
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
              </div>
            ))}
          </>
        ) : (
          <EmptyState isDark={isDark} icon="search" title={t("no_exercises_found")} />
        )}
      </div>
    </Layout>
  );
}
