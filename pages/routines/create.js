import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { exercisesList } from "../../data/exercises";
import { useUser } from "../../context/UserContext";

export default function CreateRoutine() {
  const router = useRouter();
  const { theme } = useUser();
  const isDark = theme === 'dark';

  const [routineName, setRoutineName] = useState("");
  const [exercises, setExercises] = useState([]);

  const [showSelector, setShowSelector] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(null);

  const restOptions = Array.from({ length: 120 }, (_, i) => (i + 1) * 5);

  const groups = Object.keys(exercisesList);

  const saveRoutine = () => {
    if (!routineName || exercises.length === 0) {
      alert("Pon nombre a la rutina y añade al menos un ejercicio");
      return;
    }

    const stored = JSON.parse(localStorage.getItem("myRoutines") || "[]");

    const newRoutine = {
      id: Date.now(),
      name: routineName,
      exercises,
    };

    localStorage.setItem("myRoutines", JSON.stringify([...stored, newRoutine]));
    router.push("/routines");
  };

  const addExercise = (exercise) => {
    setExercises([
      ...exercises,
      {
        name: exercise.name,
        group: selectedGroup,
        rest: 60,
        series: [
          { reps: 10, weight: 0 }
        ],
      },
    ]);

    setSelectedGroup("");
    setSelectedExercise(null);
    setShowSelector(false);
  };

  const handleSeriesChange = (exIdx, sIdx, field, value) => {
    const newExercises = [...exercises];
    newExercises[exIdx].series[sIdx][field] = value;
    setExercises(newExercises);
  };

  const addSeries = (exIdx) => {
    const newExercises = [...exercises];
    newExercises[exIdx].series.push({ reps: 10, weight: 0 });
    setExercises(newExercises);
  };

  const removeSeries = (exIdx, sIdx) => {
    const newExercises = [...exercises];
    newExercises[exIdx].series.splice(sIdx, 1);
    setExercises(newExercises);
  };

  return (
    <Layout>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "700", marginBottom: "2rem", color: isDark ? "#fff" : "#333" }}>
          Crear Nueva Rutina
        </h1>

        <div style={{
          backgroundColor: isDark ? "#1a1a1a" : "#fff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.5)" : "0 4px 12px rgba(0, 0, 0, 0.05)",
          marginBottom: "2rem",
          border: `1px solid ${isDark ? "#333" : "#eee"}`
        }}>
          <label style={{ display: "block", fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem", color: isDark ? "#fff" : "#333" }}>
            Nombre de la Rutina
          </label>
          <input
            type="text"
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            placeholder="Ej: Full Body Semana 1"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: `2px solid ${isDark ? "#333" : "#ddd"}`,
              width: "100%",
              fontSize: "1rem",
              fontFamily: "Arial, sans-serif",
              transition: "all 0.3s ease",
              boxSizing: "border-box",
              outline: "none",
              backgroundColor: isDark ? "#2a2a2a" : "#fff",
              color: isDark ? "#fff" : "#333"
            }}
            onFocus={(e) => e.target.style.borderColor = "#1dd1a1"}
            onBlur={(e) => e.target.style.borderColor = isDark ? "#333" : "#ddd"}
          />
        </div>

      {routineName && (
        <>
          {!showSelector && (
            <button 
              onClick={() => setShowSelector(true)}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#1dd1a1",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 4px rgba(29, 209, 161, 0.3)",
                marginBottom: "2rem"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#16a853";
                e.target.style.boxShadow = "0 4px 8px rgba(29, 209, 161, 0.3)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#1dd1a1";
                e.target.style.boxShadow = "0 2px 4px rgba(29, 209, 161, 0.2)";
              }}
            >
              Agregar Ejercicio
            </button>
          )}

          {showSelector && !selectedGroup && (
            <div style={{
              backgroundColor: isDark ? "#1a1a1a" : "#fff",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.5)" : "0 4px 12px rgba(0, 0, 0, 0.05)",
              marginBottom: "2rem",
              border: `1px solid ${isDark ? "#333" : "#eee"}`
            }}>
              <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "1.5rem", color: isDark ? "#fff" : "#333" }}>
                Selecciona Grupo Muscular
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem" }}>
                {groups.map((g) => (
                  <button 
                    key={g} 
                    onClick={() => setSelectedGroup(g)}
                    style={{
                      padding: "1rem",
                      backgroundColor: isDark ? "#2a2a2a" : "#f9f9f9",
                      border: `2px solid ${isDark ? "#444" : "#eee"}`,
                      borderRadius: "10px",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      color: isDark ? "#fff" : "#333",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#1dd1a1";
                      e.target.style.color = "#000";
                      e.target.style.borderColor = "#1dd1a1";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 4px 8px rgba(29, 209, 161, 0.2)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = isDark ? "#2a2a2a" : "#f9f9f9";
                      e.target.style.color = isDark ? "#fff" : "#333";
                      e.target.style.borderColor = isDark ? "#444" : "#eee";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedGroup && !selectedExercise && (
            <div style={{
              backgroundColor: isDark ? "#1a1a1a" : "#fff",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.5)" : "0 4px 12px rgba(0, 0, 0, 0.05)",
              marginBottom: "2rem",
              border: `1px solid ${isDark ? "#333" : "#eee"}`
            }}>
              <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "1.5rem", color: isDark ? "#fff" : "#333" }}>
                Ejercicios de {selectedGroup}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {exercisesList[selectedGroup].map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    style={{
                      padding: "1rem",
                      backgroundColor: isDark ? "#1e3a8a" : "#e0f2fe",
                      border: `2px solid ${isDark ? "#3b82f6" : "#bae6fd"}`,
                      borderRadius: "10px",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      color: isDark ? "#fff" : "#0369a1",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = isDark ? "#1e40af" : "#bae6fd";
                      e.target.style.borderColor = isDark ? "#60a5fa" : "#7dd3fc";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = isDark ? "#1e3a8a" : "#e0f2fe";
                      e.target.style.borderColor = isDark ? "#3b82f6" : "#bae6fd";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setSelectedGroup("")}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#7f1d1d",
                  border: "2px solid #dc2626",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#991b1b";
                  e.target.style.borderColor = "#ef4444";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#7f1d1d";
                  e.target.style.borderColor = "#dc2626";
                }}
              >
                Volver
              </button>
            </div>
          )}

          {exercises.length > 0 && (
            <div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "1.5rem", color: isDark ? "#fff" : "#333" }}>
                Ejercicios Seleccionados
              </h2>

              {exercises.map((ex, exIdx) => (
                <div
                  key={exIdx}
                  style={{
                    backgroundColor: isDark ? "#1a1a1a" : "#fff",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    marginBottom: "1.5rem",
                    boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.5)" : "0 4px 12px rgba(0,0,0,0.05)",
                    border: `1px solid ${isDark ? "#333" : "#eee"}`
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.3rem", fontWeight: "600", color: "#1dd1a1", margin: "0" }}>
                      {ex.name}
                    </h3>
                    <span style={{ 
                      backgroundColor: isDark ? "#1e3a8a" : "#e0f2fe", 
                      padding: "0.25rem 0.75rem", 
                      borderRadius: "20px", 
                      fontSize: "0.85rem", 
                      color: isDark ? "#93c5fd" : "#0369a1", 
                      fontWeight: "600", 
                      border: `1px solid ${isDark ? "#3b82f6" : "#bae6fd"}` 
                    }}>
                      {ex.group}
                    </span>
                  </div>

                  <div style={{
                    backgroundColor: isDark ? "#2a2a2a" : "#f9f9f9",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1.5rem",
                    border: `1px solid ${isDark ? "#333" : "#eee"}`
                  }}>
                    <label style={{ display: "block", fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.5rem", color: isDark ? "#fff" : "#333" }}>
                      Descanso del Ejercicio
                    </label>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      <select
                        value={ex.rest}
                        onChange={(e) => {
                          const newExercises = [...exercises];
                          newExercises[exIdx].rest = Number(e.target.value);
                          setExercises(newExercises);
                        }}
                        style={{
                          padding: "0.75rem 1rem",
                          borderRadius: "8px",
                          border: `2px solid ${isDark ? "#333" : "#ddd"}`,
                          fontSize: "1rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          flex: 1,
                          backgroundColor: isDark ? "#1a1a1a" : "#fff",
                          color: isDark ? "#fff" : "#333"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#1dd1a1"}
                        onBlur={(e) => e.target.style.borderColor = isDark ? "#333" : "#ddd"}
                      >
                        {restOptions.map((r) => {
                          const m = Math.floor(r / 60);
                          const s = r % 60;
                          return (
                            <option key={r} value={r}>
                              {m > 0 ? `${m}m ${s}s` : `${s}s`}
                            </option>
                          );
                        })}
                      </select>
                      <div style={{
                        backgroundColor: "#1dd1a1",
                        color: "#000",
                        padding: "0.75rem 1.5rem",
                        borderRadius: "8px",
                        fontSize: "1.1rem",
                        fontWeight: "700",
                        minWidth: "80px",
                        textAlign: "center"
                      }}>
                        {(() => {
                          const m = Math.floor(ex.rest / 60);
                          const s = ex.rest % 60;
                          return m > 0 ? `${m}m ${s}s` : `${s}s`;
                        })()}
                      </div>
                    </div>
                  </div>

                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "1rem"
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5", borderBottom: `2px solid ${isDark ? "#444" : "#ddd"}` }}>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: isDark ? "#fff" : "#333", fontSize: "0.95rem" }}>Serie</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: isDark ? "#fff" : "#333", fontSize: "0.95rem" }}>Reps</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: isDark ? "#fff" : "#333", fontSize: "0.95rem" }}>Peso (kg)</th>
                        <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: "600", color: isDark ? "#fff" : "#333", fontSize: "0.95rem" }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.series.map((s, sIdx) => (
                        <tr key={sIdx} style={{ borderBottom: `1px solid ${isDark ? "#333" : "#eee"}` }}>
                          <td style={{ padding: "0.75rem", fontWeight: "600", color: isDark ? "#fff" : "#333" }}>{sIdx + 1}</td>
                          <td style={{ padding: "0.75rem" }}>
                            <input
                              type="number"
                              value={s.reps}
                              onChange={(e) =>
                                handleSeriesChange(exIdx, sIdx, "reps", Number(e.target.value))
                              }
                              style={{
                                padding: "0.5rem 0.75rem",
                                borderRadius: "6px",
                                border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                                fontSize: "1rem",
                                width: "100%",
                                fontFamily: "Arial, sans-serif",
                                backgroundColor: isDark ? "#2a2a2a" : "#fff",
                                color: isDark ? "#fff" : "#333"
                              }}
                            />
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <input
                              type="number"
                              value={s.weight}
                              onChange={(e) =>
                                handleSeriesChange(exIdx, sIdx, "weight", Number(e.target.value))
                              }
                              style={{
                                padding: "0.5rem 0.75rem",
                                borderRadius: "6px",
                                border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                                fontSize: "1rem",
                                width: "100%",
                                fontFamily: "Arial, sans-serif",
                                backgroundColor: isDark ? "#2a2a2a" : "#fff",
                                color: isDark ? "#fff" : "#333"
                              }}
                            />
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>
                            <button
                              onClick={() => removeSeries(exIdx, sIdx)}
                              style={{
                                backgroundColor: "#7f1d1d",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                padding: "0.4rem 0.8rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                fontSize: "0.9rem"
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = "#dc2626";
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = "#7f1d1d";
                              }}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                      onClick={() => addSeries(exIdx)}
                      style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "#15803d",
                        border: "2px solid #22c55e",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        color: "#fff",
                        cursor: "pointer",
                        transition: "all 0.3s ease"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = "#16a34a";
                        e.target.style.borderColor = "#4ade80";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = "#15803d";
                        e.target.style.borderColor = "#22c55e";
                      }}
                    >
                      Añadir Serie
                    </button>
                    <button
                      onClick={() => {
                        const newExercises = exercises.filter((_, i) => i !== exIdx);
                        setExercises(newExercises);
                      }}
                      style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "#7f1d1d",
                        border: "2px solid #dc2626",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        color: "#fff",
                        cursor: "pointer",
                        transition: "all 0.3s ease"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = "#991b1b";
                        e.target.style.borderColor = "#ef4444";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = "#7f1d1d";
                        e.target.style.borderColor = "#dc2626";
                      }}
                    >
                      Eliminar Ejercicio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {exercises.length > 0 && (
            <button
              onClick={saveRoutine}
              style={{
                padding: "1rem 2rem",
                backgroundColor: "#1dd1a1",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontSize: "1.1rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 12px rgba(29, 209, 161, 0.4)",
                width: "100%",
                marginTop: "2rem"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#16a853";
                e.target.style.boxShadow = "0 6px 16px rgba(29, 209, 161, 0.5)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#1dd1a1";
                e.target.style.boxShadow = "0 4px 12px rgba(29, 209, 161, 0.4)";
              }}
            >
              Guardar Rutina
            </button>
          )}
        </>
      )}
      </div>
    </Layout>
  );
}
