import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { exercisesList } from "../data/exercises";
import CreateCustomExerciseModal from "./CreateCustomExerciseModal";

export default function ExerciseSelector({ onSelectExercise, onCancel }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customExercises, setCustomExercises] = useState({});
  const { theme } = useUser();
  const isDark = theme === "dark";

  useEffect(() => {
    const saved = localStorage.getItem('customExercises');
    if (saved) {
      try {
        setCustomExercises(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading custom exercises', e);
      }
    }
  }, []);

  const handleCreateCustomExercise = (customExercise) => {
    const group = customExercise.muscleGroup;
    const updated = {
      ...customExercises,
      [group]: [...(customExercises[group] || []), customExercise]
    };
    setCustomExercises(updated);
    localStorage.setItem('customExercises', JSON.stringify(updated));
    onSelectExercise(customExercise);
    setShowCreateModal(false);
  };

  const handleSelectExercise = (exercise) => {
    onSelectExercise(exercise);
  };

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDark ? "#0a0a0a" : "#f5f5f5",
    display: "flex",
    flexDirection: "column",
    zIndex: 999,
    overflow: "hidden",
  };

  const headerStyle = {
    padding: "20px",
    borderBottom: `1px solid ${isDark ? "#333" : "#ddd"}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: isDark ? "#1a1a1a" : "#fff",
  };

  const titleStyle = {
    fontSize: "1.3rem",
    fontWeight: "bold",
    color: isDark ? "#fff" : "#333",
  };

  const contentStyle = {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  };

  const closeButtonStyle = {
    backgroundColor: "transparent",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: isDark ? "#fff" : "#333",
    padding: "0",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const createButtonStyle = {
    padding: "15px",
    marginBottom: "20px",
    backgroundColor: "#008CFF",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
    transition: "all 0.3s ease",
    width: "100%",
  };

  const groupsContainerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  };

  const groupButtonStyle = (isSelected) => ({
    padding: "20px",
    backgroundColor: isSelected ? "#1dd1a1" : isDark ? "#2a2a2a" : "#fff",
    border: `2px solid ${isSelected ? "#1dd1a1" : isDark ? "#444" : "#ddd"}`,
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.95rem",
    transition: "all 0.3s ease",
    color: isSelected ? "#000" : isDark ? "#fff" : "#333",
    textAlign: "center",
  });

  const exercisesContainerStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  };

  const exerciseItemStyle = {
    padding: "15px",
    backgroundColor: isDark ? "#2a2a2a" : "#fff",
    border: `1px solid ${isDark ? "#444" : "#ddd"}`,
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const exerciseNameStyle = {
    color: isDark ? "#fff" : "#333",
    fontWeight: "500",
  };

  const exerciseTypeStyle = {
    fontSize: "0.8rem",
    color: isDark ? "#999" : "#666",
    marginTop: "5px",
  };

  const backButtonStyle = {
    padding: "10px 15px",
    marginBottom: "15px",
    backgroundColor: isDark ? "#444" : "#e0e0e0",
    color: isDark ? "#fff" : "#333",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.95rem",
    transition: "all 0.3s ease",
  };

  return (
    <>
      <div style={modalStyle} onClick={onCancel}>
        <div style={headerStyle} onClick={(e) => e.stopPropagation()}>
          <h2 style={titleStyle}>
            {selectedGroup ? `Ejercicios - ${selectedGroup}` : "Selecciona Grupo Muscular"}
          </h2>
          <button style={closeButtonStyle} onClick={onCancel}>
            ✕
          </button>
        </div>

        <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
          {selectedGroup ? (
            <>
              <button
                style={backButtonStyle}
                onClick={() => setSelectedGroup(null)}
                onMouseOver={(e) =>
                  (e.target.style.backgroundColor = isDark ? "#555" : "#d0d0d0")
                }
                onMouseOut={(e) =>
                  (e.target.style.backgroundColor = isDark ? "#444" : "#e0e0e0")
                }
              >
                ← Volver
              </button>

              <div style={exercisesContainerStyle}>
                {exercisesList[selectedGroup]?.map((exercise, index) => (
                  <div
                    key={`predefined-${index}`}
                    style={exerciseItemStyle}
                    onClick={() => handleSelectExercise(exercise)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? "#333" : "#f9f9f9";
                      e.currentTarget.style.transform = "translateX(5px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? "#2a2a2a" : "#fff";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    <div>
                      <div style={exerciseNameStyle}>{exercise.name}</div>
                      <div style={exerciseTypeStyle}>
                        {exercise.type === "weight_reps" && "Peso + Reps"}
                        {exercise.type === "reps" && "Solo Reps"}
                        {exercise.type === "time" && "Tiempo"}
                        {exercise.unit === "lastre" && " (con lastre)"}
                      </div>
                    </div>
                    <span style={{ fontSize: "1.2rem" }}>→</span>
                  </div>
                ))}
                
                {customExercises[selectedGroup]?.map((exercise, index) => (
                  <div
                    key={`custom-${index}`}
                    style={{
                      ...exerciseItemStyle,
                      borderLeft: `4px solid #008CFF`,
                      backgroundColor: isDark ? "#1a2a2a" : "#f0f8ff"
                    }}
                    onClick={() => handleSelectExercise(exercise)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? "#1a3a3a" : "#e6f2ff";
                      e.currentTarget.style.transform = "translateX(5px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? "#1a2a2a" : "#f0f8ff";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    <div>
                      <div style={exerciseNameStyle}>{exercise.name}</div>
                      <div style={exerciseTypeStyle}>
                        {exercise.type === "weight_reps" && "Peso + Reps"}
                        {exercise.type === "reps" && "Solo Reps"}
                        {exercise.type === "time" && "Tiempo"}
                        {exercise.type === "weight_bodyweight" && "Peso corporal + lastre"}
                        <span style={{ marginLeft: "8px", fontStyle: "italic" }}>✓ Personalizado</span>
                      </div>
                    </div>
                    <span style={{ fontSize: "1.2rem" }}>→</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                style={createButtonStyle}
                onClick={() => setShowCreateModal(true)}
                onMouseOver={(e) => (e.target.style.backgroundColor = "#0067cc")}
                onMouseOut={(e) => (e.target.style.backgroundColor = "#008CFF")}
              >
                ➕ Crear ejercicio personalizado
              </button>

              <div style={groupsContainerStyle}>
                {Object.keys(exercisesList).map((group) => (
                  <button
                    key={group}
                    style={groupButtonStyle(false)}
                    onClick={() => setSelectedGroup(group)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.backgroundColor = isDark ? "#333" : "#f0f0f0";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.backgroundColor = isDark ? "#2a2a2a" : "#fff";
                    }}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateCustomExerciseModal
          onSave={handleCreateCustomExercise}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}
