// pages/exercises.js
import { useState } from "react";
import Layout from "../components/Layout";
import { exercisesList } from "../data/exercises";
import { useUser } from "../context/UserContext";
import InteractiveBodyMap from "../components/InteractiveBodyMap";

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const { theme, isMobile, t } = useUser();
  const isDark = theme === 'dark';

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
      <h1 style={{ color: isDark ? "#fff" : "#333", fontSize: isMobile ? "1.8rem" : "2.5rem" }}>{t("exercises")}</h1>
      <input
        type="text"
        placeholder={t("search_exercise")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "10px",
          width: "100%",
          maxWidth: "900px",
          marginBottom: "20px",
          borderRadius: "8px",
          border: `2px solid ${isDark ? "#333" : "#ddd"}`,
          backgroundColor: isDark ? "#2a2a2a" : "#fff",
          color: isDark ? "#fff" : "#333",
          fontSize: "1rem",
          transition: "all 0.3s ease",
          boxSizing: "border-box"
        }}
        onFocus={(e) => e.target.style.borderColor = "#1dd1a1"}
        onBlur={(e) => e.target.style.borderColor = isDark ? "#333" : "#ddd"}
      />

      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "center" }}>
        <InteractiveBodyMap 
          isDark={isDark} 
          onMuscleClick={(muscle) => {
            toggleGroup(muscle);
            // Hacer scroll suave hacia el grupo expandido
            setTimeout(() => {
              const element = document.getElementById(`group-${muscle}`);
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }} 
        />
      </div>

      <div style={{ padding: isMobile ? "0" : "0 20px", maxWidth: "900px", margin: "0 auto" }}>
        {hasResults ? (
          Object.entries(filteredGroups).map(([group, exercises]) => (
            <div key={group} id={`group-${group}`} style={{ marginBottom: "1rem" }}>
              <button
                onClick={() => toggleGroup(group)}
                style={{
                  width: "100%",
                  padding: "1rem",
                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                  border: "2px solid #1dd1a1",
                  borderRadius: "8px",
                  color: "#1dd1a1",
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = isDark ? "#2a2a2a" : "#f0fdf4";
                  e.target.style.boxShadow = "0 4px 12px rgba(29, 209, 161, 0.3)";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = isDark ? "#1a1a1a" : "#fff";
                  e.target.style.boxShadow = "none";
                }}
              >
                <span>{t(group) || group}</span>
                <span style={{ fontSize: "0.8rem", transition: "transform 0.3s ease", transform: expandedGroups[group] ? "rotate(180deg)" : "rotate(0)" }}>
                  V
                </span>
              </button>
              
              {expandedGroups[group] && (
                <ul style={{ listStyle: "none", padding: "0.5rem 0 0 0", marginTop: "0.5rem" }}>
                  {exercises.map((exercise) => (
                    <li
                      key={exercise.id}
                      style={{
                        padding: "12px",
                        border: `1px solid ${isDark ? "#333" : "#eee"}`,
                        borderRadius: "8px",
                        marginBottom: "8px",
                        cursor: "pointer",
                        backgroundColor: isDark ? "#1a1a1a" : "#fff",
                        color: isDark ? "#fff" : "#333",
                        transition: "all 0.3s ease",
                        marginLeft: "1rem"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = isDark ? "#2a2a2a" : "#f9f9f9";
                        e.target.style.borderColor = "#1dd1a1";
                        e.target.style.boxShadow = "0 2px 6px rgba(29, 209, 161, 0.2)";
                        e.target.style.transform = "translateX(4px)";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = isDark ? "#1a1a1a" : "#fff";
                        e.target.style.borderColor = isDark ? "#333" : "#eee";
                        e.target.style.boxShadow = "none";
                        e.target.style.transform = "translateX(0)";
                      }}
                    >
                      {t(exercise.name)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        ) : (
          <p style={{ color: "#ccc", textAlign: "center", marginTop: "2rem" }}>{t("no_exercises_found")}</p>
        )}
      </div>
    </Layout>
  );
}
