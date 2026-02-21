import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { exercisesList } from "../../data/exercises";
import { useUser } from "../../context/UserContext";

export default function CreateRoutine() {
  const router = useRouter();
  const { id, editWorkout } = router.query;
  const { theme, t, routines, completedWorkouts, saveRoutine: contextSaveRoutine, updateRoutine: contextUpdateRoutine, updateCompletedWorkout, showNotification } = useUser();
  const [isMobile, setIsMobile] = useState(false);
  const isDark = true; // Always dark like workout mode
  const mint = "#2EE6C5";
  const mintSoft = "rgba(46, 230, 197, 0.12)";

  const [activeExerciseMenu, setActiveExerciseMenu] = useState(null); // exIdx
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState(null); // exIdx
  const [openTimePickerId, setOpenTimePickerId] = useState(null);
  const [substitutingExerciseIdx, setSubstitutingExerciseIdx] = useState(null);
  const [showTypeSelector, setShowTypeSelector] = useState(null); // { exIdx, serieIdx }
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");

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

  useEffect(() => {
    if (showDeleteExerciseConfirm !== null || showTypeSelector !== null) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showDeleteExerciseConfirm, showTypeSelector]);

  const [showSelector, setShowSelector] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(null);

  const groups = Object.keys(exercisesList);

  const getExerciseInfo = (name) => {
    for (const group in exercisesList) {
      const ex = exercisesList[group].find(e => e.name === name);
      if (ex) return ex;
    }
    return null;
  };

  const saveRoutine = async () => {
    if (!routineName || exercises.length === 0) {
      showNotification(t("alert_fill_fields"), 'error');
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
    newExercise.series = [...newExercise.series, { reps: 10, weight: 0, type: "N" }];
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

  const addExercise = (exercise) => {
    const newExercise = {
      name: exercise.name,
      group: selectedGroup,
      type: exercise.type || "weight_reps",
      rest: 60,
      series: [
        { reps: 10, weight: 0, type: "N" }
      ],
    };

    if (substitutingExerciseIdx !== null) {
      const newExercises = [...exercises];
      newExercises[substitutingExerciseIdx] = newExercise;
      setExercises(newExercises);
      setSubstitutingExerciseIdx(null);
    } else {
      setExercises([...exercises, newExercise]);
    }

    setSelectedGroup("");
    setSelectedExercise(null);
    setShowSelector(false);
  };

  // Calcular estadísticas en tiempo real
  const totalSeriesCount = exercises.reduce((sum, ex) => sum + ex.series.length, 0);
  const totalVolumeCount = exercises.reduce((sum, ex) => {
    return sum + ex.series.reduce((sSum, s) => sSum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
  }, 0);

  const baseTimeOptions = Array.from({ length: 120 }, (_, i) => {
    const iVal = (i + 1) * 5;
    let label;
    if (iVal < 60) {
      label = `${iVal}s`;
    } else {
      const minutes = Math.floor(iVal / 60);
      const seconds = iVal % 60;
      label = seconds === 0 ? `${minutes}m` : `${minutes}m${seconds}s`;
    }
    return { value: iVal, label };
  });

  return (
    <Layout>
      <div style={{ 
        padding: 0, 
        maxWidth: "900px", 
        margin: "0 auto", 
        backgroundColor: "#000", 
        minHeight: "100vh",
        color: "#fff"
      }}>
        {/* Header Superior */}
        <div style={{
          padding: "15px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#000",
          position: "sticky",
          top: 0,
          zIndex: 1002
        }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder={t("routine_name_placeholder")}
              style={{
                background: "none",
                border: "none",
                color: mint,
                fontSize: "1.2rem",
                fontWeight: "600",
                width: "100%",
                outline: "none"
              }}
            />
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button
              onClick={saveRoutine}
              style={{
                backgroundColor: mint,
                color: "#000",
                border: "none",
                borderRadius: "8px",
                padding: "8px 20px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              {isEditMode ? t("save_routine_btn") : t("save_workout")}
            </button>
          </div>
        </div>

        {/* Fila de Estadísticas */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "0 20px 20px 20px",
          backgroundColor: "#000",
          borderBottom: "1px solid #1a1a1a"
        }}>
          <div>
            <div style={{ color: "#666", fontSize: "0.75rem", marginBottom: "4px" }}>Ejercicios</div>
            <div style={{ color: mint, fontSize: "1.1rem", fontWeight: "500" }}>{exercises.length}</div>
          </div>
          <div>
            <div style={{ color: "#666", fontSize: "0.75rem", marginBottom: "4px" }}>Volumen Est.</div>
            <div style={{ color: "#fff", fontSize: "1.1rem", fontWeight: "500" }}>{totalVolumeCount.toLocaleString()} kg</div>
          </div>
          <div>
            <div style={{ color: "#666", fontSize: "0.75rem", marginBottom: "4px" }}>Series</div>
            <div style={{ color: "#fff", fontSize: "1.1rem", fontWeight: "500" }}>{totalSeriesCount}</div>
          </div>
        </div>

        <div style={{ padding: "20px 15px" }}>
          {exercises.map((exercise, exIdx) => {
            const exerciseInfo = getExerciseInfo(exercise.name);
            const isTimeBased = exerciseInfo?.type === 'time';
            const isLastre = exerciseInfo?.unit === 'lastre';

            return (
            <div
              key={exIdx}
              style={{
                marginBottom: "40px",
              }}
            >
              {/* Título del Ejercicio con Imagen */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <div style={{
                    width: "45px",
                    height: "45px",
                    borderRadius: "50%",
                    backgroundColor: "#fff",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden"
                  }}>
                    <img 
                      src={`/exercises/${(exercise?.name || "").toLowerCase().replace(/ /g, "_")}.png`} 
                      onError={(e) => { e.target.src = "/logo3.png"; }}
                      alt="" 
                      style={{ width: "80%", height: "auto" }} 
                    />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, color: mint, fontSize: "1.15rem", fontWeight: "500", lineHeight: "1.2" }}>
                      {t(exercise.name)}
                    </h2>
                    <span style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>{t(exercise.group)}</span>
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  <button 
                    onClick={() => setActiveExerciseMenu(activeExerciseMenu === exIdx ? null : exIdx)}
                    style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer" }}
                  >
                    ⋮
                  </button>
                  
                  {activeExerciseMenu === exIdx && (
                    <div style={{
                      position: "absolute",
                      top: "30px",
                      right: 0,
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                      zIndex: 100,
                      width: "160px",
                      overflow: "hidden"
                    }}>
                      <button
                        onClick={() => {
                          setSubstitutingExerciseIdx(exIdx);
                          setShowSelector(true);
                          setActiveExerciseMenu(null);
                        }}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "none",
                          border: "none",
                          color: "#fff",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          borderBottom: "1px solid #333"
                        }}
                      >
                        Sustituir ejercicio
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteExerciseConfirm(exIdx);
                          setActiveExerciseMenu(null);
                        }}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "none",
                          border: "none",
                          color: "#ff4d4d",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "0.9rem"
                        }}
                      >
                        Eliminar ejercicio
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmación de eliminación de ejercicio */}
              {showDeleteExerciseConfirm === exIdx && (
                <div style={{
                  position: "fixed",
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.8)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 2100
                }}>
                  <div style={{
                    backgroundColor: "#1a1a1a",
                    borderRadius: "12px",
                    padding: "25px",
                    width: "300px",
                    textAlign: "center",
                    border: "1px solid #333"
                  }}>
                    <h3 style={{ color: "#fff", margin: "0 0 15px 0" }}>¿Eliminar ejercicio?</h3>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => setShowDeleteExerciseConfirm(null)}
                        style={{
                          flex: 1,
                          padding: "10px",
                          backgroundColor: "#333",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer"
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          const newExercises = exercises.filter((_, i) => i !== exIdx);
                          setExercises(newExercises);
                          setShowDeleteExerciseConfirm(null);
                        }}
                        style={{
                          flex: 1,
                          padding: "10px",
                          backgroundColor: "#ff4d4d",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer"
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Temporizador de Descanso */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px", 
                color: mint, 
                marginBottom: "20px",
                fontSize: "0.95rem"
              }}>
                <span 
                  onClick={() => setOpenTimePickerId(openTimePickerId === exIdx ? null : exIdx)}
                  style={{ cursor: "pointer", fontWeight: "500" }}
                >
                  Descanso: {exercise.rest < 60 ? `${exercise.rest}s` : `${Math.floor(exercise.rest/60)}min ${exercise.rest%60}s`}
                </span>
                
                {openTimePickerId === exIdx && (
                  <div style={{ 
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.8)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 2100
                  }}>
                    <div style={{
                      backgroundColor: "#1a1a1a",
                      borderRadius: "15px",
                      width: "280px",
                      padding: "20px",
                      textAlign: "center"
                    }}>
                      <h3 style={{ color: "#fff", margin: "0 0 20px 0" }}>Editar Descanso</h3>
                      
                      <div style={{ 
                        height: "250px", 
                        overflowY: "scroll", 
                        padding: "10px 0"
                      }}>
                        {baseTimeOptions.map((opt) => (
                          <div 
                            key={opt.value}
                            onClick={() => {
                              const newExercises = [...exercises];
                              newExercises[exIdx].rest = opt.value;
                              setExercises(newExercises);
                              setOpenTimePickerId(null);
                            }}
                            style={{
                              padding: "12px 0",
                              color: exercise.rest === opt.value ? "#000" : "#fff",
                              backgroundColor: exercise.rest === opt.value ? mint : "transparent",
                              borderRadius: "8px",
                              fontSize: "1.1rem",
                              cursor: "pointer",
                              margin: "2px 0"
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                      
                      <button 
                        onClick={() => setOpenTimePickerId(null)}
                        style={{
                          width: "100%",
                          marginTop: "20px",
                          padding: "12px",
                          backgroundColor: "#333",
                          color: "#fff",
                          border: "none",
                          borderRadius: "10px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabla de Series */}
              <div style={{ marginBottom: "15px" }}>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "50px 1fr 70px 70px 45px", 
                  gap: "10px", 
                  marginBottom: "10px",
                  color: "#666",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  <div>SERIE</div>
                  <div>ANTERIOR</div>
                  <div style={{ textAlign: "center" }}>{isTimeBased ? "TIEMPO" : isLastre ? "LASTRE" : "KG"}</div>
                  <div style={{ textAlign: "center" }}>{isTimeBased ? "KM/H" : "REPS"}</div>
                  <div style={{ textAlign: "right" }}></div>
                </div>

                {exercise.series.map((serie, serieIdx) => {
                  const type = serie.type || "N";
                  
                  // Calcular el número de serie efectiva (N)
                  let effectiveIndex = 0;
                  for (let i = 0; i < serieIdx; i++) {
                    if (exercise.series[i].type === "N" || !exercise.series[i].type) effectiveIndex++;
                  }

                  return (
                    <div
                      key={serieIdx}
                      style={{
                        display: "grid", 
                        gridTemplateColumns: "50px 1fr 70px 70px 45px", 
                        gap: "10px",
                        alignItems: "center",
                        height: "45px",
                        marginBottom: "5px"
                      }}
                    >
                      <div 
                        onClick={() => setShowTypeSelector({ exIdx, serieIdx })}
                        style={{ 
                          color: type === "N" ? "#fff" : mint, 
                          fontWeight: "bold",
                          fontSize: "1rem",
                          backgroundColor: "#1a1a1a",
                          borderRadius: "4px",
                          textAlign: "center",
                          padding: "4px 0",
                          cursor: "pointer"
                        }}
                      >
                        {type === "W" ? "W" : type === "D" ? "D" : effectiveIndex + 1}
                      </div>
                      
                      <div style={{ color: "#666", fontSize: "0.9rem" }}>—</div>
                      
                      <div>
                        <input
                          type="number"
                          value={serie.weight}
                          onChange={(e) => handleSeriesChange(exIdx, serieIdx, "weight", Number(e.target.value))}
                          style={{
                            width: "100%",
                            background: "#1a1a1a",
                            border: "none",
                            borderRadius: "4px",
                            color: "#fff",
                            padding: "6px 0",
                            textAlign: "center",
                            fontSize: "1rem"
                          }}
                        />
                      </div>
                      
                      <div>
                        <input
                          type="number"
                          value={serie.reps}
                          onChange={(e) => handleSeriesChange(exIdx, serieIdx, "reps", Number(e.target.value))}
                          style={{
                            width: "100%",
                            background: "#1a1a1a",
                            border: "none",
                            borderRadius: "4px",
                            color: "#fff",
                            padding: "6px 0",
                            textAlign: "center",
                            fontSize: "1rem"
                          }}
                        />
                      </div>
                      
                      <div style={{ textAlign: "right" }}>
                        <button 
                          onClick={() => removeSeries(exIdx, serieIdx)}
                          style={{ background: "none", border: "none", color: "#ff4d4d", cursor: "pointer", fontSize: "1.2rem" }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => addSeries(exIdx)}
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#1a1a1a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
              >
                + Agregar Serie
              </button>
            </div>
          );})}

          <button 
            onClick={() => setShowSelector(true)}
            style={{
              width: "100%",
              padding: "15px",
              backgroundColor: mintSoft,
              color: mint,
              border: `1px dashed ${mint}`,
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              marginBottom: "40px"
            }}
          >
            + AGREGAR EJERCICIO
          </button>
        </div>

        {/* Modal de Selector de Ejercicios */}
        {showSelector && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "#000", zIndex: 2000, overflowY: "auto",
            padding: "20px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, color: "#fff" }}>{selectedGroup ? t(selectedGroup) : t("select_muscle_group")}</h2>
              <button 
                onClick={() => {
                  if (selectedGroup) setSelectedGroup("");
                  else {
                    setShowSelector(false);
                    setSubstitutingExerciseIdx(null);
                  }
                }}
                style={{ background: "none", border: "none", color: mint, fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer" }}
              >
                {t("back")}
              </button>
            </div>

            {!selectedGroup ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "15px" }}>
                {groups.map((g) => (
                  <button 
                    key={g} 
                    onClick={() => setSelectedGroup(g)}
                    style={{
                      padding: "20px",
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    {t(g)}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                {exercisesList[selectedGroup].map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    style={{
                      padding: "15px",
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: "1rem",
                      fontWeight: "500",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "15px"
                    }}
                  >
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#fff", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
                      <img src={`/exercises/${ex.name.toLowerCase().replace(/ /g, "_")}.png`} onError={(e) => e.target.src = "/logo3.png"} style={{ width: "80%" }} />
                    </div>
                    {t(ex.name)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
