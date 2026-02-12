import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { exercisesList } from "../../data/exercises";
import { useUser } from "../../context/UserContext";

export default function CreateRoutine() {
  const router = useRouter();
  const { id, editWorkout } = router.query;
  const { theme, t, routines, completedWorkouts, saveRoutine: contextSaveRoutine, updateRoutine: contextUpdateRoutine, updateCompletedWorkout } = useUser();
  const [isMobile, setIsMobile] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [routineName, setRoutineName] = useState("");
  const [exercises, setExercises] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isWorkoutEditMode, setIsWorkoutEditMode] = useState(false);

  useEffect(() => {
    if (id && routines.length > 0) {
      const routineToEdit = routines.find(r => r.id.toString() === id.toString());
      if (routineToEdit) {
        setRoutineName(routineToEdit.name);
        setExercises(routineToEdit.exercises);
        setIsEditMode(true);
      }
    }
  }, [id, routines]);

  useEffect(() => {
    if (editWorkout && completedWorkouts.length > 0) {
      const workoutToEdit = completedWorkouts.find(w => w.id.toString() === editWorkout.toString());
      if (workoutToEdit) {
        setRoutineName(workoutToEdit.name);
        // Completed workouts use 'details', routines use 'exercises'
        setExercises(workoutToEdit.details || workoutToEdit.exercises || []);
        setIsWorkoutEditMode(true);
      }
    }
  }, [editWorkout, completedWorkouts]);

  const [showSelector, setShowSelector] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(null);

  const restOptions = Array.from({ length: 120 }, (_, i) => (i + 1) * 5);

  const groups = Object.keys(exercisesList);

  const saveRoutine = async () => {
    if (!routineName || exercises.length === 0) {
      alert(t("alert_fill_fields"));
      return;
    }

    if (isWorkoutEditMode) {
      // Calcular estadísticas del entrenamiento para consistencia
      let totalVolume = 0;
      let totalReps = 0;
      let totalSeries = 0;

      exercises.forEach(ex => {
        if (ex.series && Array.isArray(ex.series)) {
          ex.series.forEach(s => {
            totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
            totalReps += Number(s.reps) || 0;
            totalSeries += 1;
          });
        }
      });

      const updatedWorkout = {
        ...completedWorkouts.find(w => w.id.toString() === editWorkout.toString()),
        name: routineName,
        details: exercises, // Los entrenamientos usan 'details'
        totalVolume,
        totalReps,
        series: totalSeries,
        exercises: exercises.length
      };
      await updateCompletedWorkout(updatedWorkout);
      router.push("/profile");
    } else if (isEditMode) {
      const updatedRoutine = {
        id: Number(id),
        name: routineName,
        exercises,
      };
      await contextUpdateRoutine(updatedRoutine);
      router.push("/routines");
    } else {
      const newRoutine = {
        id: Date.now(),
        name: routineName,
        exercises,
      };
      await contextSaveRoutine(newRoutine);
      router.push("/routines");
    }
  };

  const addExercise = (exercise) => {
    setExercises([
      ...exercises,
      {
        name: exercise.name,
        group: selectedGroup,
        type: exercise.type || "weight_reps",
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
    const newExercise = { ...newExercises[exIdx] };
    const newSeries = [...newExercise.series];
    newSeries[sIdx] = { ...newSeries[sIdx], [field]: value };
    newExercise.series = newSeries;
    newExercises[exIdx] = newExercise;
    setExercises(newExercises);
  };

  const addSeries = (exIdx) => {
    const newExercises = [...exercises];
    const newExercise = { ...newExercises[exIdx] };
    newExercise.series = [...newExercise.series, { reps: 10, weight: 0 }];
    newExercises[exIdx] = newExercise;
    setExercises(newExercises);
  };

  const removeSeries = (exIdx, sIdx) => {
    const newExercises = [...exercises];
    const newExercise = { ...newExercises[exIdx] };
    newExercise.series = newExercise.series.filter((_, i) => i !== sIdx);
    newExercises[exIdx] = newExercise;
    setExercises(newExercises);
  };

  return (
    <Layout>
      <div style={{ maxWidth: isMobile ? "100%" : "1200px", margin: isMobile ? "0" : "0 auto", padding: isMobile ? "0" : "20px" }}>
        <h1 style={{ fontSize: isMobile ? "1.8rem" : "2.5rem", fontWeight: "700", marginBottom: isMobile ? "1rem" : "2rem", color: isDark ? "#fff" : "#333" }}>
          {isWorkoutEditMode ? "Editar entrenamiento" : (isEditMode ? t("edit_routine") : t("create_new_routine"))}
        </h1>

        <div style={{
          backgroundColor: isDark ? "#1a1a1a" : "#fff",
          borderRadius: "12px",
          padding: isMobile ? "1rem" : "2rem",
          boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.5)" : "0 4px 12px rgba(0, 0, 0, 0.05)",
          marginBottom: isMobile ? "1rem" : "2rem",
          border: `1px solid ${isDark ? "#333" : "#eee"}`
        }}>
          <label style={{ display: "block", fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem", color: isDark ? "#fff" : "#333" }}>
            {t("routine_name_label")}
          </label>
          <input
            type="text"
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            placeholder={t("routine_name_placeholder")}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: `2px solid ${isDark ? "#333" : "#ddd"}`,
              width: "100%",
              fontSize: "1rem",
              fontFamily: "inherit",
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
                {t("select_muscle_group")}
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
                    {t(g)}
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
                {t("exercises_of")} {t(selectedGroup)}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {exercisesList[selectedGroup].map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    style={{
                      padding: "1rem",
                      backgroundColor: isDark ? "#1a1a1a" : "#f0fdf4",
                      border: `2px solid #1dd1a1`,
                      borderRadius: "10px",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      color: "#1dd1a1",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = isDark ? "#2a2a2a" : "#e6fffa";
                      e.target.style.boxShadow = "0 4px 12px rgba(29, 209, 161, 0.3)";
                      e.target.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = isDark ? "#1a1a1a" : "#f0fdf4";
                      e.target.style.boxShadow = "none";
                      e.target.style.transform = "translateY(0)";
                    }}
                  >
                    {t(ex.name)}
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
                {t("back")}
              </button>
            </div>
          )}

          {exercises.length > 0 && (
            <div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "1.5rem", color: isDark ? "#fff" : "#333" }}>
                {t("selected_exercises")}
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
                      {t(ex.name)}
                    </h3>
                    <span style={{ 
                      backgroundColor: isDark ? "#1a1a1a" : "#f0fdf4", 
                      padding: "0.25rem 0.75rem", 
                      borderRadius: "20px", 
                      fontSize: "0.85rem", 
                      color: "#1dd1a1", 
                      fontWeight: "600", 
                      border: `1px solid #1dd1a1` 
                    }}>
                      {t(ex.group)}
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
                      {t("exercise_rest")}
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
                        <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: isDark ? "#fff" : "#333", fontSize: "0.95rem" }}>{t("series_label")}</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: isDark ? "#fff" : "#333", fontSize: "0.95rem" }}>{t("reps_label")}</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "600", color: isDark ? "#fff" : "#333", fontSize: "0.95rem" }}>{t("weight_kg")}</th>
                        <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: "600", color: isDark ? "#fff" : "#333", fontSize: "0.95rem" }}>{t("action")}</th>
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
                                fontFamily: "inherit",
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
                                fontFamily: "inherit",
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
                              {t("delete")}
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
                      {t("add_series")}
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
                      {t("delete_exercise")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {exercises.length > 0 && !showSelector && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "2rem" }}>
              <button 
                onClick={() => setShowSelector(true)}
                style={{
                  padding: "1rem 2rem",
                  backgroundColor: isDark ? "#333" : "#eee",
                  color: isDark ? "#fff" : "#333",
                  border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                  borderRadius: "8px",
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  width: "100%"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = isDark ? "#444" : "#e0e0e0";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = isDark ? "#333" : "#eee";
                }}
              >
                {t("add_exercise")}
              </button>

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
                  width: "100%"
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
                {isEditMode ? t("save_routine_btn") : t("save_workout")}
              </button>
            </div>
          )}

          {exercises.length === 0 && routineName && !showSelector && (
            <button 
              onClick={() => setShowSelector(true)}
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
                marginTop: "1rem"
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
              {t("add_exercise")}
            </button>
          )}
        </>
      )}
      </div>
    </Layout>
  );
}
