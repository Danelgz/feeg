// pages/exercises.js
import { useState } from "react";
import Layout from "../components/Layout";
import { exercisesList } from "../data/exercises";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { translateExerciseName } from "../lib/exerciseTranslation";
import { Icon, EmptyState, PageHeader } from "../components/ui";

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const { theme, isMobile, t, language } = useUser();
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
                style={{
                  width: "100%",
                  padding: "1rem",
                  backgroundColor: tk.surface,
                  border: `2px solid ${tk.accent}`,
                  borderRadius: tk.radius.sm,
                  color: tk.accent,
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: tk.transition,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = tk.accentSoft;
                  e.currentTarget.style.boxShadow = tk.shadow.accent;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = tk.surface;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span>{t(group) || group}</span>
                <span style={{ display: "flex", transition: "transform 0.3s ease", transform: expandedGroups[group] ? "rotate(180deg)" : "rotate(0)" }}>
                  <Icon name="chevronLeft" size={16} style={{ transform: "rotate(-90deg)" }} />
                </span>
              </button>

              {expandedGroups[group] && (
                <ul style={{ listStyle: "none", padding: "0.5rem 0 0 0", marginTop: "0.5rem" }}>
                  {exercises.map((exercise) => (
                    <li
                      key={exercise.id}
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
                      {translateExerciseName(exercise.name, language)}
                    </li>
                  ))}
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
