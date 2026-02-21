import { useState } from "react";
import { useUser } from "../context/UserContext";

const muscleGroups = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Cuádriceps",
  "Femoral",
  "Glúteos",
  "Gemelos",
  "Cuello",
  "Abdomen",
  "Core",
  "Antebrazos",
  "Pantorrillas",
];

const trackingTypes = [
  { id: "weight_reps", label: "Peso y repeticiones", description: "Peso en kg + reps" },
  { id: "reps", label: "Solo repeticiones", description: "Solo cuenta reps" },
  { id: "time", label: "Tiempo", description: "Duración en minutos" },
  { id: "weight_bodyweight", label: "Peso corporal + peso", description: "Lastre adicional" },
];

export default function CreateCustomExerciseModal({ onSave, onCancel }) {
  const [exerciseName, setExerciseName] = useState("");
  const [trackingType, setTrackingType] = useState("weight_reps");
  const [muscleGroup, setMuscleGroup] = useState("Pecho");
  const { theme, t } = useUser();
  const isDark = theme === "dark";

  const handleSave = (e) => {
    e.preventDefault();
    if (!exerciseName.trim()) return;

    const customExercise = {
      id: `custom_${Date.now()}`,
      name: exerciseName,
      type: trackingType,
      muscleGroup,
      isCustom: true,
    };

    if (trackingType === "weight_bodyweight") {
      customExercise.unit = "lastre";
    }

    onSave(customExercise);
    setExerciseName("");
    setTrackingType("weight_reps");
    setMuscleGroup("Pecho");
  };

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
  };

  const contentStyle = {
    backgroundColor: isDark ? "#1a1a1a" : "#fff",
    borderRadius: "12px",
    padding: "30px",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
  };

  const titleStyle = {
    fontSize: "1.5rem",
    fontWeight: "bold",
    marginBottom: "20px",
    color: isDark ? "#fff" : "#333",
    fontFamily: "Arial",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: isDark ? "#fff" : "#333",
    fontSize: "0.95rem",
    fontFamily: "Arial",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "8px",
    border: `1px solid ${isDark ? "#444" : "#ccc"}`,
    backgroundColor: isDark ? "#2a2a2a" : "#fff",
    color: isDark ? "#fff" : "#333",
    fontSize: "1rem",
    boxSizing: "border-box",
    fontFamily: "Arial",
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  const typesContainerStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "20px",
  };

  const typeButtonStyle = (isSelected) => ({
    padding: "15px",
    borderRadius: "8px",
    border: `2px solid ${isSelected ? "#1dd1a1" : isDark ? "#444" : "#ccc"}`,
    backgroundColor: isSelected ? (isDark ? "#1a3a2a" : "#e8f8f5") : isDark ? "#2a2a2a" : "#f5f5f5",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textAlign: "center",
    fontFamily: "Arial",
  });

  const typeTextStyle = {
    fontWeight: "600",
    fontSize: "0.9rem",
    marginBottom: "5px",
    color: isDark ? "#fff" : "#333",
    fontFamily: "Arial",
  };

  const typeDescStyle = {
    fontSize: "0.75rem",
    color: isDark ? "#999" : "#666",
    fontFamily: "Arial",
  };

  const buttonContainerStyle = {
    display: "flex",
    gap: "10px",
    marginTop: "30px",
  };

  const buttonStyle = (isCancel = false) => ({
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
    transition: "all 0.3s ease",
    backgroundColor: isCancel ? (isDark ? "#444" : "#e0e0e0") : "#1dd1a1",
    color: isCancel ? (isDark ? "#fff" : "#333") : "#000",
    fontFamily: "Arial",
  });

  return (
    <div style={modalStyle} onClick={onCancel}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>Crear Ejercicio Personalizado</h2>

        <form onSubmit={handleSave}>
          <label style={labelStyle}>Nombre del Ejercicio</label>
          <input
            type="text"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            placeholder="Ej: Flexiones paralelas"
            style={inputStyle}
            autoFocus
          />

          <label style={labelStyle}>Tipo de Seguimiento</label>
          <div style={typesContainerStyle}>
            {trackingTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                style={typeButtonStyle(trackingType === type.id)}
                onClick={() => setTrackingType(type.id)}
              >
                <div style={typeTextStyle}>{type.label}</div>
                <div style={typeDescStyle}>{type.description}</div>
              </button>
            ))}
          </div>

          <label style={labelStyle}>Grupo Muscular</label>
          <select
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            style={selectStyle}
          >
            {muscleGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>

          <div style={buttonContainerStyle}>
            <button
              type="button"
              style={buttonStyle(true)}
              onClick={onCancel}
              onMouseOver={(e) =>
                (e.target.style.backgroundColor = isDark ? "#555" : "#d0d0d0")
              }
              onMouseOut={(e) =>
                (e.target.style.backgroundColor = isDark ? "#444" : "#e0e0e0")
              }
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={buttonStyle()}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#16a085")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#1dd1a1")}
            >
              Crear Ejercicio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
