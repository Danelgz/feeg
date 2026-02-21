import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { exercisesList } from "../data/exercises";
import CreateCustomExerciseModal from "./CreateCustomExerciseModal";

export default function ExerciseForm({ addExercise }) {
  const [name, setName] = useState("");
  const [series, setSeries] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const { theme, t } = useUser();
  const isDark = theme === 'dark';
  const [isMobile, setIsMobile] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [exerciseInfo, setExerciseInfo] = useState(null);

  useEffect(() => {
    if (!name) {
      setExerciseInfo(null);
      return;
    }
    for (const group in exercisesList) {
      const found = exercisesList[group].find(ex => ex.name.toLowerCase() === name.toLowerCase());
      if (found) {
        setExerciseInfo(found);
        return;
      }
    }
    setExerciseInfo(null);
  }, [name]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !series) return;
    
    const exerciseToAdd = selectedExercise || exerciseInfo;
    
    addExercise({
      name,
      series,
      reps: reps || "-", 
      weight: weight || "-",
      type: exerciseToAdd?.type || "weight_reps",
      unit: exerciseToAdd?.unit,
      isCustom: selectedExercise?.isCustom || false
    });
    setName("");
    setSeries("");
    setReps("");
    setWeight("");
    setSelectedExercise(null);
  };

  const handleCreateCustomExercise = (customExercise) => {
    setSelectedExercise(customExercise);
    setName(customExercise.name);
    setShowCreateModal(false);
  };

  const inputStyle = {
    padding: "12px",
    marginRight: isMobile ? "0" : "10px",
    borderRadius: "8px",
    border: `1px solid ${isDark ? "#444" : "#ccc"}`,
    backgroundColor: isDark ? "#2a2a2a" : "#fff",
    color: isDark ? "#fff" : "#333",
    marginBottom: "10px",
    flex: isMobile ? "1 1 100%" : "1 1 150px",
    fontSize: "1rem",
    boxSizing: "border-box"
  };

  const exerciseTypeInfo = selectedExercise || exerciseInfo;

  return (
    <>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "15px" }}>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "10px 15px",
              backgroundColor: selectedExercise ? "#008CFF" : "#f0f2f5",
              color: selectedExercise ? "#fff" : "#333",
              border: `2px solid ${selectedExercise ? "#008CFF" : "#ccc"}`,
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              transition: "all 0.3s ease",
              fontSize: "0.9rem",
              width: isMobile ? "100%" : "auto"
            }}
            onMouseOver={(e) => {
              if (!selectedExercise) e.target.style.backgroundColor = "#e8e8e8";
            }}
            onMouseOut={(e) => {
              if (!selectedExercise) e.target.style.backgroundColor = "#f0f2f5";
            }}
          >
            ➕ Crear ejercicio personalizado
          </button>
          {selectedExercise && (
            <button
              type="button"
              onClick={() => {
                setSelectedExercise(null);
                setName("");
                setSeries("");
                setReps("");
                setWeight("");
              }}
              style={{
                padding: "10px 15px",
                backgroundColor: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                transition: "all 0.3s ease",
                fontSize: "0.9rem",
                width: isMobile ? "100%" : "auto"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#991b1b"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#dc2626"}
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        {selectedExercise && (
          <div style={{
            backgroundColor: isDark ? "#2a2a2a" : "#e8f5e9",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "15px",
            border: `1px solid ${isDark ? "#444" : "#c8e6c9"}`,
            color: isDark ? "#fff" : "#2e7d32"
          }}>
            <strong>Ejercicio personalizado:</strong> {selectedExercise.name} ({selectedExercise.muscleGroup})
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: isMobile ? "0" : "5px" }}>
        <input
          type="text"
          placeholder={t("exercise_name_placeholder")}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (selectedExercise) setSelectedExercise(null);
          }}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder={t("series_placeholder")}
          value={series}
          onChange={(e) => setSeries(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder={exerciseTypeInfo?.type === 'time' ? "Velocidad (opcional)" : t("reps_optional_placeholder")}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder={exerciseTypeInfo?.type === 'time' ? "Tiempo (min)" : exerciseTypeInfo?.unit === 'lastre' ? "Lastre (kg)" : t("weight_optional_placeholder")}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          style={inputStyle}
        />
        <button
          type="submit"
          style={{
            padding: "10px 15px",
            backgroundColor: "#1dd1a1",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.3s ease",
            marginBottom: "10px",
            width: isMobile ? "100%" : "auto",
            height: "45px",
            fontSize: "1rem"
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = "#16a085"}
          onMouseOut={(e) => e.target.style.backgroundColor = "#1dd1a1"}
        >
          {t("add_exercise_btn")}
        </button>
      </form>

      {showCreateModal && (
        <CreateCustomExerciseModal
          onSave={handleCreateCustomExercise}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}
