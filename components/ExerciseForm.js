import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";

export default function ExerciseForm({ addExercise }) {
  const [name, setName] = useState("");
  const [series, setSeries] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const { theme, t } = useUser();
  const isDark = theme === 'dark';
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !series) return; // mínimo nombre y series
    
    // Buscar tipo de ejercicio en la lista global
    const exercisesData = require("../data/exercises").exercisesList;
    let exerciseType = "weight_reps";
    
    Object.values(exercisesData).forEach(group => {
      const found = group.find(ex => ex.name.toLowerCase() === name.toLowerCase());
      if (found) exerciseType = found.type;
    });

    addExercise({
      name,
      series,
      reps: reps || "-", 
      weight: weight || "-",
      type: exerciseType
    });
    setName("");
    setSeries("");
    setReps("");
    setWeight("");
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

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: isMobile ? "0" : "5px" }}>
      <input
        type="text"
        placeholder={t("exercise_name_placeholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
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
        placeholder={t("reps_optional_placeholder")}
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        style={inputStyle}
      />
      <input
        type="text"
        placeholder={t("weight_optional_placeholder")}
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
  );
}
