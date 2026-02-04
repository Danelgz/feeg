import { useState } from "react";
import { useUser } from "../context/UserContext";

export default function ExerciseForm({ addExercise }) {
  const [name, setName] = useState("");
  const [series, setSeries] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const { theme } = useUser();
  const isDark = theme === 'dark';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !series) return; // mínimo nombre y series
    addExercise({
      name,
      series,
      reps: reps || "-", 
      weight: weight || "-"
    });
    setName("");
    setSeries("");
    setReps("");
    setWeight("");
  };

  const inputStyle = {
    padding: "8px",
    marginRight: "10px",
    borderRadius: "5px",
    border: `1px solid ${isDark ? "#444" : "#ccc"}`,
    backgroundColor: isDark ? "#2a2a2a" : "#fff",
    color: isDark ? "#fff" : "#333",
    marginBottom: "10px",
    flex: "1 1 150px"
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "5px" }}>
      <input
        type="text"
        placeholder="Nombre del ejercicio"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="Series"
        value={series}
        onChange={(e) => setSeries(e.target.value)}
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="Repeticiones (opcional)"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="Peso (opcional)"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        style={inputStyle}
      />
      <button
        type="submit"
        style={{
          padding: "8px 12px",
          backgroundColor: "#1dd1a1",
          color: "#000",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontWeight: "600",
          transition: "all 0.3s ease",
          marginBottom: "10px",
          height: "38px"
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = "#16a085"}
        onMouseOut={(e) => e.target.style.backgroundColor = "#1dd1a1"}
      >
        Añadir ejercicio
      </button>
    </form>
  );
}
