import { useState } from "react";
import ExerciseForm from "./ExerciseForm";
import { useUser } from "../context/UserContext";

export default function RoutineForm({ saveRoutine }) {
  const [name, setName] = useState("");
  const [days, setDays] = useState("");
  const [exercises, setExercises] = useState([]);
  const { theme } = useUser();
  const isDark = theme === 'dark';

  const addExercise = (exercise) => {
    setExercises([...exercises, exercise]);
  };

  const deleteExercise = (index) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !days) return;
    saveRoutine({ name, days, exercises });
    setName("");
    setDays("");
    setExercises([]);
  };

  const inputStyle = {
    padding: "8px",
    marginRight: "10px",
    borderRadius: "5px",
    border: `1px solid ${isDark ? "#444" : "#ccc"}`,
    backgroundColor: isDark ? "#2a2a2a" : "#fff",
    color: isDark ? "#fff" : "#333",
    marginBottom: "10px"
  };

  return (
    <div style={{ marginBottom: "30px" }}>
      <h2 style={{ color: isDark ? "#fff" : "#333" }}>Crear nueva rutina</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <input
          type="text"
          placeholder="Nombre de la rutina"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Días (Lun, Mar...)"
          value={days}
          onChange={(e) => setDays(e.target.value)}
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
            height: "38px"
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = "#16a085"}
          onMouseOut={(e) => e.target.style.backgroundColor = "#1dd1a1"}
        >
          Guardar rutina
        </button>
      </form>

      <h3 style={{ color: isDark ? "#fff" : "#333" }}>Ejercicios de esta rutina</h3>
      <ExerciseForm addExercise={addExercise} />
      {exercises.length === 0 && <p style={{ color: isDark ? "#ccc" : "#666" }}>No hay ejercicios añadidos.</p>}
      {exercises.map((ex, i) => (
        <div key={i} style={{
          backgroundColor: isDark ? "#1a1a1a" : "#f9f9f9",
          padding: "10px",
          borderRadius: "5px",
          marginBottom: "10px",
          boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: `1px solid ${isDark ? "#333" : "#eee"}`
        }}>
          <span style={{ color: isDark ? "#fff" : "#333" }}>{ex.name} — Series: {ex.series} | Reps: {ex.reps} | Peso: {ex.weight}</span>
          <button
            onClick={() => deleteExercise(i)}
            style={{
              backgroundColor: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              padding: "4px 8px",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#991b1b"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#dc2626"}
          >
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
}
