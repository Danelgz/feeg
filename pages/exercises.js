// pages/exercises.js
import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { exercisesList } from "../data/exercises";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { translateExerciseName } from "../lib/exerciseTranslation";
import { Icon, EmptyState, PageHeader, Badge } from "../components/ui";
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
          Object.entries(filteredGroups).map(([group, exercises]) => (
            <div key={group} id={`group-${group}`} style={{ marginBottom: "1rem" }}>
              <button
                onClick={() => toggleGroup(group)}
                className="feeg-surface feeg-press feeg-hover"
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: tk.radius.sm,
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left",
                  "--feeg-bg": tk.surface,
                  "--feeg-fg": tk.accent,
                  "--feeg-border": tk.accent,
                  "--feeg-hover-bg": tk.accentSoft,
                  "--feeg-border-width": "2px",
                  "--feeg-press-scale": 0.99,
                }}
              >
                <span>{t(group) || group}</span>
                <span style={{ display: "flex", transition: "transform 0.3s ease", transform: expandedGroups[group] ? "rotate(180deg)" : "rotate(0)" }}>
                  <Icon name="chevronLeft" size={16} style={{ transform: "rotate(-90deg)" }} />
                </span>
              </button>

              {expandedGroups[group] && (
                <ul style={{ listStyle: "none", padding: "0.5rem 0 0 0", marginTop: "0.5rem" }}>
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
              )}
            </div>
          ))
        ) : (
          <EmptyState isDark={isDark} icon="search" title={t("no_exercises_found")} />
        )}
      </div>
    </Layout>
  );
}
