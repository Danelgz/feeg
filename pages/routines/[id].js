import Layout from "../../components/Layout";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../context/UserContext";

export default function RoutineDetail() {
  const router = useRouter();
  const { theme } = useUser();
  const isDark = theme === 'dark';
  const { id } = router.query;
  const [routine, setRoutine] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [workoutState, setWorkoutState] = useState("preview"); // preview, ongoing, completed
  const [seriesCompleted, setSeriesCompleted] = useState({});
  const [currentReps, setCurrentReps] = useState({});
  const [currentWeight, setCurrentWeight] = useState({});
  const [restTime, setRestTime] = useState(null);
  const [editingRestTime, setEditingRestTime] = useState(false);
  const [tempRestTime, setTempRestTime] = useState("");
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [exercisesData, setExercisesData] = useState(null);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [countdownActive, setCountdownActive] = useState(false);
  const [openTimePickerId, setOpenTimePickerId] = useState(null);
  const [wheelScrollPositions, setWheelScrollPositions] = useState({});
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [finishFormData, setFinishFormData] = useState({
    name: '',
    comments: '',
    totalTime: 0
  });
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const handleUpdateReps = (serieIdx, newReps) => {
    const key = `${currentExerciseIndex}-${serieIdx}`;
    setCurrentReps({
      ...currentReps,
      [key]: newReps
    });
  };

  const handleUpdateWeight = (serieIdx, newWeight) => {
    const key = `${currentExerciseIndex}-${serieIdx}`;
    setCurrentWeight({
      ...currentWeight,
      [key]: newWeight
    });
  };

  const handleAddSeries = () => {
    const newSeries = [...currentExercise.series, { reps: "", weight: "" }];
    const updatedExercises = [...routine.exercises];
    updatedExercises[currentExerciseIndex].series = newSeries;
    
    setRoutine({ ...routine, exercises: updatedExercises });
    
    // Initialize tracking for new series
    const newKey = `${currentExerciseIndex}-${newSeries.length - 1}`;
    setSeriesCompleted({ ...seriesCompleted, [newKey]: false });
    setCurrentReps({ ...currentReps, [newKey]: "" });
    setCurrentWeight({ ...currentWeight, [newKey]: "" });
  };

  const handleDeleteSeries = (serieIdx) => {
    const newSeries = currentExercise.series.filter((_, i) => i !== serieIdx);
    const updatedExercises = [...routine.exercises];
    updatedExercises[currentExerciseIndex].series = newSeries;
    
    setRoutine({ ...routine, exercises: updatedExercises });
    
    // Clean up tracking objects for deleted series
    const newSeriesCompleted = {};
    const newCurrentReps = {};
    const newCurrentWeight = {};
    
    Object.keys(seriesCompleted).forEach((key) => {
      const [exIdx, serIdx] = key.split("-").map(Number);
      if (exIdx === currentExerciseIndex) {
        if (serIdx < serieIdx) {
          newSeriesCompleted[key] = seriesCompleted[key];
          newCurrentReps[key] = currentReps[key];
          newCurrentWeight[key] = currentWeight[key];
        } else if (serIdx > serieIdx) {
          const newKey = `${exIdx}-${serIdx - 1}`;
          newSeriesCompleted[newKey] = seriesCompleted[key];
          newCurrentReps[newKey] = currentReps[key];
          newCurrentWeight[newKey] = currentWeight[key];
        }
      } else {
        newSeriesCompleted[key] = seriesCompleted[key];
        newCurrentReps[key] = currentReps[key];
        newCurrentWeight[key] = currentWeight[key];
      }
    });
    
    setSeriesCompleted(newSeriesCompleted);
    setCurrentReps(newCurrentReps);
    setCurrentWeight(newCurrentWeight);
  };

  useEffect(() => {
    if (id !== undefined) {
      const stored = localStorage.getItem("myRoutines");
      if (stored) {
        const routines = JSON.parse(stored);
        if (routines[id]) {
          setRoutine(routines[id]);
          // Initialize tracking objects
          const seriesTracker = {};
          const repsTracker = {};
          const weightTracker = {};
          
          routines[id].exercises.forEach((ex, exIdx) => {
            ex.series.forEach((serie, serieIdx) => {
              const key = `${exIdx}-${serieIdx}`;
              seriesTracker[key] = false;
              repsTracker[key] = serie.reps || "";
              weightTracker[key] = serie.weight || "";
            });
          });
          
          setSeriesCompleted(seriesTracker);
          setCurrentReps(repsTracker);
          setCurrentWeight(weightTracker);
          setRestTime(routines[id].exercises[0]?.rest || 60);
        }
      }
    }
  }, [id]);

  // Countdown effect
  useEffect(() => {
    let interval;
    if (countdownActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCountdownActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdownActive, countdown]);

  // Routine timer effect
  useEffect(() => {
    let interval;
    if (workoutState === "ongoing") {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [workoutState]);

  const formatElapsedTime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(" ");
  };

  if (!routine) {
    return (
      <Layout>
        <div style={{ padding: "20px" }}>
          <p>Cargando rutina...</p>
        </div>
      </Layout>
    );
  }

  const currentExercise = routine.exercises[currentExerciseIndex];

  // Generate time wheel options (5s incrementos)
  const generateTimeOptions = () => {
    const options = [];
    // 5-600 segundos por 5 (5s a 10 minutos en incrementos de 5s)
    for (let i = 5; i <= 600; i += 5) {
      let label;
      if (i < 60) {
        label = `${i}s`;
      } else {
        const minutes = Math.floor(i / 60);
        const seconds = i % 60;
        label = seconds === 0 ? `${minutes}m` : `${minutes}m${seconds}s`;
      }
      options.push({ value: i, label });
    }
    return options;
  };

  const baseTimeOptions = generateTimeOptions();
  // Crear array con repetición para efecto de bucle infinito
  const timeOptions = [...baseTimeOptions, ...baseTimeOptions, ...baseTimeOptions];

  const handleUpdateRestTime = (newTime) => {
    setRestTime(parseInt(newTime) || 0);
    const updatedExercises = [...routine.exercises];
    updatedExercises[currentExerciseIndex].rest = parseInt(newTime) || 0;
    setRoutine({ ...routine, exercises: updatedExercises });
  };

  const handleStartCountdown = (seconds) => {
    setCountdown(seconds);
    setCountdownActive(true);
  };

  const handleAddExercise = () => {
    const data = require("../../data/exercises").exercisesList;
    setExercisesData(data);
    setShowAddExerciseModal(true);
  };

  const handleSelectExercise = (exerciseName) => {
    const newExercise = {
      name: exerciseName,
      rest: 60,
      series: [{ reps: 10, weight: 0 }]
    };
    
    const updatedExercises = [...routine.exercises, newExercise];
    setRoutine({ ...routine, exercises: updatedExercises });
    
    // Initialize tracking for new exercise
    const newExIdx = updatedExercises.length - 1;
    const newKey = `${newExIdx}-0`;
    setSeriesCompleted({ ...seriesCompleted, [newKey]: false });
    setCurrentReps({ ...currentReps, [newKey]: 10 });
    setCurrentWeight({ ...currentWeight, [newKey]: 0 });
    
    // Close modal
    setShowAddExerciseModal(false);
    setSelectedGroup(null);
  };

  const handleDeleteExercise = (exIdx) => {
    if (routine.exercises.length > 1) {
      const updatedExercises = routine.exercises.filter((_, i) => i !== exIdx);
      setRoutine({ ...routine, exercises: updatedExercises });
      
      if (currentExerciseIndex >= updatedExercises.length) {
        setCurrentExerciseIndex(updatedExercises.length - 1);
      }
      
      // Clean up tracking objects
      const newSeriesCompleted = {};
      const newCurrentReps = {};
      const newCurrentWeight = {};
      
      Object.keys(seriesCompleted).forEach((key) => {
        const [exIndexKey] = key.split("-")[0];
        if (exIndexKey !== exIdx.toString()) {
          newSeriesCompleted[key] = seriesCompleted[key];
          newCurrentReps[key] = currentReps[key];
          newCurrentWeight[key] = currentWeight[key];
        }
      });
      
      setSeriesCompleted(newSeriesCompleted);
      setCurrentReps(newCurrentReps);
      setCurrentWeight(newCurrentWeight);
    }
  };

  const handleMarkSeriesComplete = (serieIdx) => {
    const key = `${currentExerciseIndex}-${serieIdx}`;
    setSeriesCompleted({
      ...seriesCompleted,
      [key]: !seriesCompleted[key]
    });
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < routine.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
  };

  const handleCompleteWorkout = () => {
    setShowFinishConfirmation(true);
  };

  const handleConfirmFinish = () => {
    setShowFinishConfirmation(false);
    setFinishFormData({
      name: routine.name,
      comments: '',
      totalTime: Math.floor(elapsedTime / 60)
    });
    setShowFinishForm(true);
  };

  const handleSaveFinishedRoutine = () => {
    // Calcular estadísticas
    const totalSeries = routine.exercises.reduce((sum, ex) => sum + ex.series.length, 0);
    const totalReps = Object.values(currentReps).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    const totalVolume = Object.keys(currentWeight).reduce((sum, key) => {
      const weight = parseInt(currentWeight[key]) || 0;
      const reps = parseInt(currentReps[key]) || 0;
      return sum + (weight * reps);
    }, 0);

    // Guardar rutina completada
    const completedRoutine = {
      id: Date.now(),
      name: finishFormData.name,
      comments: finishFormData.comments,
      completedAt: new Date().toISOString(),
      totalTime: finishFormData.totalTime,
      elapsedTime: elapsedTime,
      exercises: routine.exercises.length,
      series: totalSeries,
      totalReps: totalReps,
      totalVolume: totalVolume,
      exerciseDetails: routine.exercises.map((ex, exIdx) => ({
        name: ex.name,
        series: ex.series.map((s, sIdx) => ({
          reps: currentReps[`${exIdx}-${sIdx}`] || s.reps,
          weight: currentWeight[`${exIdx}-${sIdx}`] || s.weight
        }))
      }))
    };

    // Guardar en localStorage
    const savedWorkouts = JSON.parse(localStorage.getItem('completedWorkouts') || '[]');
    savedWorkouts.push(completedRoutine);
    localStorage.setItem('completedWorkouts', JSON.stringify(savedWorkouts));

    setSavingWorkout(true);

    // Redirigir a la página de rutinas después de guardar
    setTimeout(() => {
      router.push('/routines?tab=completed');
    }, 1500);
  };

  const buttonStyle = {
    padding: "10px 15px",
    backgroundColor: "#1dd1a1",
    color: "#000",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: "600",
    transition: "all 0.3s ease"
  };

  const buttonHoverStyle = {
    onMouseOver: (e) => {
      e.target.style.backgroundColor = "#16a853";
      e.target.style.boxShadow = "0 4px 12px rgba(29, 209, 161, 0.4)";
    },
    onMouseOut: (e) => {
      e.target.style.backgroundColor = "#1dd1a1";
      e.target.style.boxShadow = "none";
    }
  };

  if (workoutState === "preview") {
    return (
      <Layout>
        <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
          <Link href="/routines">
            <button style={{ ...buttonStyle, marginBottom: "20px", backgroundColor: isDark ? "#444" : "#ddd", color: isDark ? "#fff" : "#333" }} {...buttonHoverStyle}>
              Atrás
            </button>
          </Link>

          <h1 style={{ color: isDark ? "#fff" : "#333" }}>{routine.name}</h1>
          <p style={{ color: isDark ? "#aaa" : "#666", marginBottom: "20px" }}>
            {routine.exercises.length} ejercicios · {routine.exercises.reduce((sum, ex) => sum + ex.series.length, 0)} series totales
          </p>

          <div style={{
            backgroundColor: isDark ? "#1a1a1a" : "#fff",
            border: `1px solid ${isDark ? "#333" : "#eee"}`,
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
            boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{ marginTop: 0, color: isDark ? "#fff" : "#333" }}>Resumen de la Rutina</h2>
            {routine.exercises.map((exercise, idx) => (
              <div key={idx} style={{
                backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                padding: "12px",
                marginBottom: "10px",
                borderRadius: "6px",
                border: `1px solid ${isDark ? "#2a2a2a" : "#eee"}`
              }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#1dd1a1" }}>{exercise.name}</h3>
                <p style={{ margin: "0", color: isDark ? "#aaa" : "#666" }}>
                  {exercise.series.length} series · Descanso: {exercise.rest}s
                </p>
                {exercise.series.map((serie, sIdx) => (
                  <div key={sIdx} style={{ fontSize: "0.9rem", color: isDark ? "#999" : "#888", marginLeft: "10px" }}>
                    Serie {sIdx + 1}: {serie.reps} reps - {serie.weight}kg
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button
            onClick={() => setWorkoutState("ongoing")}
            style={{
              ...buttonStyle,
              fontSize: "1.1rem",
              padding: "12px 30px",
              backgroundColor: "#1dd1a1"
            }}
            {...buttonHoverStyle}
          >
            Iniciar Rutina
          </button>
        </div>
      </Layout>
    );
  }

  // Modal de confirmación para terminar rutina - DEBE ESTAR ANTES DEL ESTADO ONGOING
  if (showFinishConfirmation) {
    return (
      <Layout>
        <div style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 100px)"
        }}>
          <div style={{
            backgroundColor: isDark ? "#1a1a1a" : "#fff",
            border: `2px solid ${isDark ? "#1dd1a1" : "#008CFF"}`,
            borderRadius: "12px",
            padding: "40px",
            maxWidth: "500px",
            textAlign: "center",
            boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ color: isDark ? "#1dd1a1" : "#333", marginBottom: "20px", fontSize: "1.5rem" }}>
              ¿Estás seguro que quieres terminar la rutina?
            </h2>
            <p style={{ color: isDark ? "#ccc" : "#666", marginBottom: "30px" }}>
              Podrás editar el nombre, añadir comentarios y revisar el resumen en el siguiente paso.
            </p>
            <div style={{ display: "flex", gap: "15px" }}>
              <button
                onClick={() => setShowFinishConfirmation(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: isDark ? "#444" : "#ddd",
                  color: isDark ? "#fff" : "#333",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = isDark ? "#555" : "#ccc"}
                onMouseOut={(e) => e.target.style.backgroundColor = isDark ? "#444" : "#ddd"}
              >
                No, Continuar
              </button>
              <button
                onClick={handleConfirmFinish}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#1dd1a1",
                  color: "#000",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#16a853"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#1dd1a1"}
              >
                Sí, Terminar
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Formulario para finalizar rutina - DEBE ESTAR ANTES DEL ESTADO ONGOING
  if (showFinishForm) {
    const totalSeries = routine.exercises.reduce((sum, ex) => sum + ex.series.length, 0);
    const totalReps = Object.values(currentReps).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    const totalWeight = Object.values(currentWeight).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const totalExercises = routine.exercises.length;

    return (
      <Layout>
        <div style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 100px)"
        }}>
          <div style={{
            backgroundColor: isDark ? "#1a1a1a" : "#fff",
            border: `2px solid ${isDark ? "#1dd1a1" : "#eee"}`,
            borderRadius: "12px",
            padding: "40px",
            maxWidth: "600px",
            width: "100%",
            boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ color: isDark ? "#1dd1a1" : "#333", marginBottom: "30px", fontSize: "1.5rem", textAlign: "center" }}>
              Finalizar Entrenamiento
            </h2>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.9rem", marginBottom: "8px" }}>
                Nombre de la rutina
              </label>
              <input
                type="text"
                value={finishFormData.name}
                onChange={(e) => setFinishFormData({ ...finishFormData, name: e.target.value })}
                placeholder="Ej: Día de Pecho"
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                  border: `1px solid ${isDark ? "#333" : "#ddd"}`,
                  borderRadius: "6px",
                  color: isDark ? "#fff" : "#333",
                  fontSize: "1rem",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.9rem", marginBottom: "8px" }}>
                Comentarios
              </label>
              <textarea
                value={finishFormData.comments}
                onChange={(e) => setFinishFormData({ ...finishFormData, comments: e.target.value })}
                placeholder="Ej: Me sentí con mucha energía hoy"
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                  border: `1px solid ${isDark ? "#333" : "#ddd"}`,
                  borderRadius: "6px",
                  color: isDark ? "#fff" : "#333",
                  fontSize: "1rem",
                  minHeight: "80px",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  resize: "vertical"
                }}
              />
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.9rem", marginBottom: "8px" }}>
                Tiempo total (minutos)
              </label>
              <input
                type="number"
                value={finishFormData.totalTime}
                onChange={(e) => setFinishFormData({ ...finishFormData, totalTime: e.target.value })}
                placeholder="Ej: 45"
                min="1"
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                  border: `1px solid ${isDark ? "#333" : "#ddd"}`,
                  borderRadius: "6px",
                  color: isDark ? "#fff" : "#333",
                  fontSize: "1rem",
                  boxSizing: "border-box"
                }}
              />
              <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#1dd1a1" }}>
                Tiempo real: {formatElapsedTime(elapsedTime)}
              </p>
            </div>

            <div style={{
              backgroundColor: isDark ? "#0f0f0f" : "#f1f1f1",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "25px"
            }}>
              <h3 style={{ color: isDark ? "#1dd1a1" : "#333", marginBottom: "15px", fontSize: "1.1rem" }}>
                Resumen del Entrenamiento
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px"
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#1dd1a1", fontSize: "1.8rem", fontWeight: "700" }}>
                    {totalExercises}
                  </div>
                  <div style={{ color: isDark ? "#aaa" : "#666", fontSize: "0.9rem" }}>
                    Ejercicios
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#1dd1a1", fontSize: "1.8rem", fontWeight: "700" }}>
                    {totalSeries}
                  </div>
                  <div style={{ color: isDark ? "#aaa" : "#666", fontSize: "0.9rem" }}>
                    Series
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#1dd1a1", fontSize: "1.8rem", fontWeight: "700" }}>
                    {totalReps}
                  </div>
                  <div style={{ color: isDark ? "#aaa" : "#666", fontSize: "0.9rem" }}>
                    Repeticiones
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#1dd1a1", fontSize: "1.8rem", fontWeight: "700" }}>
                    {totalWeight.toFixed(1)}kg
                  </div>
                  <div style={{ color: isDark ? "#aaa" : "#666", fontSize: "0.9rem" }}>
                    Volumen Total
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "15px" }}>
              <button
                onClick={() => setShowFinishForm(false)}
                disabled={savingWorkout}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: isDark ? (savingWorkout ? "#333" : "#444") : (savingWorkout ? "#ddd" : "#ccc"),
                  color: isDark ? "#fff" : "#333",
                  border: "none",
                  borderRadius: "8px",
                  cursor: savingWorkout ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                  opacity: savingWorkout ? 0.6 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFinishedRoutine}
                disabled={savingWorkout}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: savingWorkout ? "#16a853" : "#1dd1a1",
                  color: savingWorkout ? "#fff" : "#000",
                  border: "none",
                  borderRadius: "8px",
                  cursor: savingWorkout ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                  opacity: savingWorkout ? 0.8 : 1
                }}
              >
                {savingWorkout ? "Guardado! Redirigiendo..." : "Guardar Entrenamiento"}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (workoutState === "ongoing") {
    return (
      <Layout>
        <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
          {/* Main Routine Timer - Fixed in Corner */}
          <div style={{
            position: "fixed",
            top: "80px",
            right: "20px",
            backgroundColor: countdownActive && countdown > 0 
              ? (isDark ? "rgba(29, 209, 161, 0.95)" : "rgba(0, 140, 255, 0.95)") 
              : (isDark ? "rgba(26, 26, 26, 0.9)" : "rgba(255, 255, 255, 0.9)"),
            backdropFilter: "blur(4px)",
            color: (countdownActive && countdown > 0) 
              ? (isDark ? "#000" : "#fff") 
              : (isDark ? "#fff" : "#333"),
            padding: "8px 12px",
            borderRadius: "8px",
            textAlign: "center",
            border: (countdownActive && countdown > 0) 
              ? "2px solid #fff" 
              : `1px solid ${isDark ? "#333" : "#ddd"}`,
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: "120px",
            transition: "all 0.3s ease"
          }}>
            <div style={{ 
              fontSize: "0.65rem", 
              color: (countdownActive && countdown > 0) 
                ? (isDark ? "#000" : "#fff") 
                : (isDark ? "#aaa" : "#888"), 
              fontWeight: "800", 
              textTransform: "uppercase", 
              letterSpacing: "0.5px",
              marginBottom: "2px"
            }}>
              {countdownActive && countdown > 0 ? "DESCANSO" : "TRABAJO"}
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: "bold", fontFamily: "monospace" }}>
              {countdownActive && countdown > 0 
                ? (Math.floor(countdown / 60) > 0
                  ? `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, "0")}`
                  : `${countdown}s`)
                : formatElapsedTime(elapsedTime)
              }
            </div>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
          }}>
            <h1 style={{ margin: 0, color: isDark ? "#fff" : "#333" }}>
              {routine.name}
            </h1>
          </div>

          {routine.exercises.map((exercise, exIdx) => (
            <div
              key={exIdx}
              style={{
                backgroundColor: isDark ? "#1a1a1a" : "#fff",
                border: `1px solid ${isDark ? "#333" : "#eee"}`,
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h2 style={{ margin: 0, color: isDark ? "#1dd1a1" : "#333" }}>
                  {exIdx + 1}. {exercise.name}
                </h2>
                {routine.exercises.length > 1 && (
                  <button
                    onClick={() => handleDeleteExercise(exIdx)}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "#ff4d4d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "600"
                    }}
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9", borderRadius: "6px" }}>
                <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.9rem", marginBottom: "10px" }}>Descanso entre series:</label>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setOpenTimePickerId(openTimePickerId === exIdx ? null : exIdx)}
                    style={{
                      width: "100%",
                      padding: "10px 15px",
                      backgroundColor: isDark ? "#2a2a2a" : "#eee",
                      color: isDark ? "#1dd1a1" : "#333",
                      border: `1px solid ${isDark ? "#333" : "#ddd"}`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <span>
                      {exercise.rest ? (
                        (() => {
                          if (exercise.rest < 60) {
                            return `${exercise.rest}s`;
                          } else {
                            const minutes = Math.floor(exercise.rest / 60);
                            const seconds = exercise.rest % 60;
                            return seconds === 0 ? `${minutes}m` : `${minutes}m${seconds}s`;
                          }
                        })()
                      ) : "Elegir tiempo de descanso"}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#666" }}>▼</span>
                  </button>

                  {openTimePickerId === exIdx && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "8px",
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      overflow: "hidden",
                      zIndex: 1000,
                      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                      padding: "8px 0"
                    }}>
                      {/* Rueda tipo spinner */}
                      <div style={{
                        height: "150px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        position: "relative"
                      }}>
                        {/* Área scrollable tipo rueda */}
                        <div
                          data-wheel-picker={exIdx}
                          ref={(el) => {
                            if (el && !wheelScrollPositions[exIdx]) {
                              const baseLength = baseTimeOptions.length;
                              const selectedOptionIdx = baseTimeOptions.findIndex(opt => opt.value === exercise.rest);
                              if (selectedOptionIdx !== -1) {
                                // Empezar en la segunda repetición para tener arriba y abajo
                                setTimeout(() => {
                                  el.scrollTop = (baseLength + selectedOptionIdx) * 30 - 60;
                                }, 0);
                              }
                            }
                          }}
                          onWheel={(e) => {
                            e.preventDefault();
                            const wheelElement = e.currentTarget;
                            const scrollSpeed = 30;
                            const direction = e.deltaY > 0 ? 1 : -1;
                            wheelElement.scrollTop += direction * scrollSpeed;
                          }}
                          onScroll={(e) => {
                            const baseLength = baseTimeOptions.length;
                            setWheelScrollPositions({
                              ...wheelScrollPositions,
                              [exIdx]: e.target.scrollTop
                            });
                            // Detectar el elemento del centro (snap)
                            const itemHeight = 30;
                            const centerPos = e.target.scrollTop + 60;
                            const selectedIdx = Math.round(centerPos / itemHeight);
                            
                            // Usar módulo para el bucle infinito
                            const actualIdx = selectedIdx % baseLength;
                            if (actualIdx >= 0 && actualIdx < baseLength) {
                              const updatedExercises = [...routine.exercises];
                              updatedExercises[exIdx].rest = baseTimeOptions[actualIdx].value;
                              setRoutine({ ...routine, exercises: updatedExercises });
                            }

                            // Detectar si necesitamos hacer scroll infinito
                            if (selectedIdx >= baseLength * 2.5) {
                              setTimeout(() => {
                                e.target.scrollTop = selectedIdx % baseLength * 30 + baseLength * 30 - 60;
                              }, 0);
                            } else if (selectedIdx <= baseLength * 0.5) {
                              setTimeout(() => {
                                e.target.scrollTop = (selectedIdx % baseLength + baseLength) * 30 - 60;
                              }, 0);
                            }
                          }}
                          style={{
                            width: "100%",
                            height: "100%",
                            overflowY: "scroll",
                            overflowX: "hidden",
                            scrollBehavior: "auto",
                            scrollSnapType: "y mandatory",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center"
                          }}
                        >
                          {/* Espaciador arriba - permite llegar al primer elemento */}
                          <div style={{ height: "60px", flexShrink: 0 }} />
                          
                          {/* Opciones */}
                          {timeOptions.map((option, idx) => {
                            const baseLength = baseTimeOptions.length;
                            const currentScrollTop = wheelScrollPositions[exIdx] || 0;
                            const itemTop = idx * 30;
                            const distanceFromCenter = Math.abs(itemTop - (currentScrollTop + 60));
                            const isCenter = distanceFromCenter < 20;
                            const opacity = 1 - (distanceFromCenter / 160);
                            
                            return (
                              <div
                                key={`${option.value}-${idx}`}
                                onClick={() => {
                                  // Actualizar valor inmediatamente
                                  const baseLength = baseTimeOptions.length;
                                  const actualIdx = idx % baseLength;
                                  const updatedExercises = [...routine.exercises];
                                  updatedExercises[exIdx].rest = baseTimeOptions[actualIdx].value;
                                  setRoutine({ ...routine, exercises: updatedExercises });
                                  // Cerrar la ruleta
                                  setOpenTimePickerId(null);
                                }}
                                style={{
                                  height: "30px",
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  cursor: "pointer",
                                  scrollSnapAlign: "center",
                                  scrollSnapStop: "always",
                                  fontSize: isCenter ? "0.95rem" : "0.75rem",
                                  fontWeight: isCenter ? "700" : "400",
                                  color: isCenter ? "#1dd1a1" : `rgba(170, 170, 170, ${Math.max(0.3, opacity)})`,
                                  transition: "all 0.15s ease",
                                  textShadow: isCenter ? "0 0 10px rgba(29, 209, 161, 0.4)" : "none",
                                  transform: isCenter ? "scale(1.1)" : "scale(1)"
                                }}
                              >
                                {option.label}
                              </div>
                            );
                          })}

                          {/* Espaciador abajo - permite llegar al último elemento */}
                          <div style={{ height: "60px", flexShrink: 0 }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <h3 style={{ margin: "0 0 12px 0", color: "#fff" }}>Series</h3>
              {exercise.series.map((serie, serieIdx) => {
                const key = `${exIdx}-${serieIdx}`;
                const isCompleted = seriesCompleted[key];
                
                return (
                  <div
                    key={serieIdx}
                    style={{
                      backgroundColor: isCompleted ? "rgba(29, 209, 161, 0.1)" : "#0f0f0f",
                      border: isCompleted ? "2px solid #1dd1a1" : "1px solid #2a2a2a",
                      borderRadius: "6px",
                      padding: "15px",
                      marginBottom: "10px",
                      transition: "all 0.3s ease",
                      opacity: isCompleted ? 0.8 : 1
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px", flex: 1 }}>
                        <button
                          onClick={() => {
                            const newSeriesCompleted = { ...seriesCompleted };
                            const isNowCompleted = !newSeriesCompleted[key];
                            newSeriesCompleted[key] = isNowCompleted;
                            setSeriesCompleted(newSeriesCompleted);
                            
                            // Si se marca como completada, inicia o reinicia el countdown
                            if (isNowCompleted && exercise.rest) {
                              handleStartCountdown(exercise.rest);
                            }
                            
                            // Si se desmarca, detiene el countdown
                            if (!isNowCompleted) {
                              setCountdown(null);
                              setCountdownActive(false);
                            }
                          }}
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: isCompleted ? "#1dd1a1" : (isDark ? "#2a2a2a" : "#ddd"),
                            color: isCompleted ? "#000" : (isDark ? "#999" : "#888"),
                            border: "none",
                            fontWeight: "bold",
                            fontSize: "1rem",
                            cursor: "pointer",
                            transition: "all 0.3s ease"
                          }}
                        >
                      {isCompleted ? "X" : "✓"}
                    </button>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div>
                            <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.8rem", marginBottom: "3px" }}>Reps</label>
                            <input
                              type="number"
                              value={currentReps[key] || ""}
                              onChange={(e) => {
                                setCurrentReps({
                                  ...currentReps,
                                  [key]: e.target.value
                                });
                              }}
                              style={{
                                padding: "6px 8px",
                                backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                                border: `1px solid ${isDark ? "#333" : "#ddd"}`,
                                borderRadius: "4px",
                                color: isDark ? "#fff" : "#333",
                                width: "70px",
                                fontSize: "0.95rem",
                                textAlign: "center"
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.8rem", marginBottom: "3px" }}>Peso (kg)</label>
                            <input
                              type="number"
                              value={currentWeight[key] || ""}
                              onChange={(e) => {
                                setCurrentWeight({
                                  ...currentWeight,
                                  [key]: e.target.value
                                });
                              }}
                              step="0.5"
                              style={{
                                padding: "6px 8px",
                                backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                                border: `1px solid ${isDark ? "#333" : "#ddd"}`,
                                borderRadius: "4px",
                                color: isDark ? "#fff" : "#333",
                                width: "70px",
                                fontSize: "0.95rem",
                                textAlign: "center"
                              }}
                            />
                          </div>

                          <span style={{ color: isDark ? "#aaa" : "#666" }}>
                            Serie {serieIdx + 1}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const newSeries = exercise.series.filter((_, i) => i !== serieIdx);
                          const updatedExercises = [...routine.exercises];
                          updatedExercises[exIdx].series = newSeries;
                          setRoutine({ ...routine, exercises: updatedExercises });

                          // Clean up tracking
                          const newSeriesCompleted = {};
                          const newCurrentReps = {};
                          const newCurrentWeight = {};

                          Object.keys(seriesCompleted).forEach((k) => {
                            const [exIndexKey, serIdx] = k.split("-").map(Number);
                            if (exIndexKey === exIdx && serIdx !== serieIdx) {
                              const newKey = serIdx > serieIdx ? `${exIdx}-${serIdx - 1}` : k;
                              newSeriesCompleted[newKey] = seriesCompleted[k];
                              newCurrentReps[newKey] = currentReps[k];
                              newCurrentWeight[newKey] = currentWeight[k];
                            } else if (exIndexKey !== exIdx) {
                              newSeriesCompleted[k] = seriesCompleted[k];
                              newCurrentReps[k] = currentReps[k];
                              newCurrentWeight[k] = currentWeight[k];
                            }
                          });

                          setSeriesCompleted(newSeriesCompleted);
                          setCurrentReps(newCurrentReps);
                          setCurrentWeight(newCurrentWeight);
                        }}
                        style={{
                          padding: "6px 10px",
                          backgroundColor: "#ff4d4d",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          marginLeft: "10px"
                        }}
                      >
                        Eliminar Serie
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => {
                  const newSeries = [...exercise.series, { reps: "", weight: "" }];
                  const updatedExercises = [...routine.exercises];
                  updatedExercises[exIdx].series = newSeries;
                  setRoutine({ ...routine, exercises: updatedExercises });

                  const newKey = `${exIdx}-${newSeries.length - 1}`;
                  setSeriesCompleted({ ...seriesCompleted, [newKey]: false });
                  setCurrentReps({ ...currentReps, [newKey]: "" });
                  setCurrentWeight({ ...currentWeight, [newKey]: "" });
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: isDark ? "#2a2a2a" : "#eee",
                  color: isDark ? "#1dd1a1" : "#008CFF",
                  border: `2px dashed ${isDark ? "#1dd1a1" : "#008CFF"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  marginTop: "10px",
                  transition: "all 0.3s ease"
                }}
              >
                Agregar Serie
              </button>
            </div>
          ))}

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <button
              onClick={handleAddExercise}
              style={{
                ...buttonStyle,
                flex: 1,
                backgroundColor: "#1dd1a1",
                color: "#000"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#16a853";
                e.target.style.boxShadow = "0 4px 12px rgba(29, 209, 161, 0.4)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#1dd1a1";
                e.target.style.boxShadow = "none";
              }}
            >
              Agregar Ejercicio
            </button>
          </div>

          <button
            onClick={handleCompleteWorkout}
            style={{
              ...buttonStyle,
              fontSize: "1.1rem",
              padding: "12px 30px",
              width: "100%",
              backgroundColor: "#2ecc71",
              marginBottom: "15px"
            }}
            {...buttonHoverStyle}
          >
            Completar Rutina
          </button>

          <button
            onClick={() => setWorkoutState("preview")}
            style={{
              ...buttonStyle,
              marginTop: "10px",
              width: "100%",
              backgroundColor: isDark ? "#444" : "#ddd",
              color: isDark ? "#fff" : "#333"
            }}
          >
            Cancelar
          </button>

          {/* Modal para agregar ejercicio */}
          {showAddExerciseModal && exercisesData && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000
              }}
              onClick={() => {
                setShowAddExerciseModal(false);
                setSelectedGroup(null);
              }}
            >
              <div
                style={{
                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                  border: `2px solid ${isDark ? "#1dd1a1" : "#eee"}`,
                  borderRadius: "12px",
                  padding: "30px",
                  maxWidth: "500px",
                  maxHeight: "80vh",
                  overflowY: "auto",
                  width: "90%",
                  boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.1)"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ marginTop: 0, color: isDark ? "#1dd1a1" : "#333", marginBottom: "20px" }}>
                  {selectedGroup ? `Ejercicios - ${selectedGroup}` : "Selecciona un grupo muscular"}
                </h2>

                {!selectedGroup ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {Object.keys(exercisesData).map((group) => (
                      <button
                        key={group}
                        onClick={() => setSelectedGroup(group)}
                        style={{
                          padding: "12px",
                          backgroundColor: isDark ? "#2a2a2a" : "#f1f1f1",
                          color: isDark ? "#1dd1a1" : "#333",
                          border: `1px solid ${isDark ? "#1dd1a1" : "#ddd"}`,
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.95rem",
                          fontWeight: "600",
                          transition: "all 0.3s ease"
                        }}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "15px" }}>
                      {exercisesData[selectedGroup]?.map((exercise, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectExercise(exercise.name)}
                          style={{
                            padding: "12px",
                            backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                            color: isDark ? "#1dd1a1" : "#333",
                            border: `1px solid ${isDark ? "#333" : "#eee"}`,
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.95rem",
                            fontWeight: "600",
                            transition: "all 0.3s ease",
                            textAlign: "left"
                          }}
                        >
                          {exercise.name}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setSelectedGroup(null)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: isDark ? "#444" : "#ddd",
                        color: isDark ? "#fff" : "#333",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.95rem",
                        fontWeight: "600"
                      }}
                    >
                      Atrás
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowAddExerciseModal(false);
                    setSelectedGroup(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    marginTop: "15px",
                    backgroundColor: "#ff4d4d",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    fontWeight: "600"
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  if (workoutState === "completed") {
    return (
      <Layout>
        <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
          {!showFullSummary ? (
            <>
              {/* Resumen Pequeño */}
              <div style={{
                backgroundColor: "#1a1a1a",
                border: "2px solid #1dd1a1",
                borderRadius: "12px",
                padding: "30px",
                marginBottom: "20px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                transform: "scale(1)"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(29, 209, 161, 0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
              onClick={() => setShowFullSummary(true)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "20px" }}>
                  <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "1.5rem", color: "#1dd1a1", margin: "0 0 10px 0" }}>
                  ¡Rutina Completada!
                </h2>
                    <p style={{ fontSize: "1rem", color: "#aaa", margin: "0 0 8px 0" }}>
                      <strong>{routine.name}</strong>
                    </p>
                    <p style={{ color: "#999", fontSize: "0.9rem", margin: "0" }}>
                      {routine.exercises.length} ejercicios · {routine.exercises.reduce((sum, ex) => sum + ex.series.length, 0)} series completadas
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setWorkoutState("preview");
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#008CFF",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600",
                      transition: "all 0.3s ease",
                      whiteSpace: "nowrap"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#0073CC";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = "#008CFF";
                    }}
                  >
                    Editar
                  </button>
                </div>
              </div>

              {/* Botón para volver */}
              <Link href="/routines">
                <button style={{
                  padding: "10px 20px",
                  backgroundColor: "#2a2a2a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#444";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#2a2a2a";
                }}
                >
                  ← Volver a Mis Rutinas
                </button>
              </Link>
            </>
          ) : (
            <>
              {/* Resumen Completo */}
              <button
                onClick={() => setShowFullSummary(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#2a2a2a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  marginBottom: "20px",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#444";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#2a2a2a";
                }}
              >
                ← Volver al Resumen
              </button>

              <div style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "12px",
                padding: "30px"
              }}>
                <h1 style={{ fontSize: "2rem", color: "#1dd1a1", marginBottom: "20px" }}>
                  {routine.name}
                </h1>

                {routine.exercises.map((exercise, exIdx) => (
                  <div key={exIdx} style={{
                    marginBottom: "25px",
                    paddingBottom: "20px",
                    borderBottom: exIdx < routine.exercises.length - 1 ? "1px solid #2a2a2a" : "none"
                  }}>
                    <h3 style={{ color: "#1dd1a1", marginBottom: "12px", fontSize: "1.2rem" }}>
                      {exercise.name}
                    </h3>
                    <p style={{ color: "#aaa", fontSize: "0.9rem", marginBottom: "12px" }}>
                      Descanso: {(() => {
                        if (exercise.rest < 60) {
                          return `${exercise.rest}s`;
                        } else {
                          const minutes = Math.floor(exercise.rest / 60);
                          const seconds = exercise.rest % 60;
                          return seconds === 0 ? `${minutes}m` : `${minutes}m${seconds}s`;
                        }
                      })()}
                    </p>
                    
                    <div style={{ marginLeft: "15px" }}>
                      {exercise.series.map((serie, sIdx) => {
                        const key = `${exIdx}-${sIdx}`;
                        return (
                          <div key={sIdx} style={{
                            backgroundColor: "#0f0f0f",
                            border: "1px solid #2a2a2a",
                            borderRadius: "6px",
                            padding: "10px 12px",
                            marginBottom: "8px",
                            color: "#ccc",
                            fontSize: "0.9rem"
                          }}>
                            Serie {sIdx + 1}: {currentReps[key] || serie.reps} reps - {currentWeight[key] || serie.weight}kg
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div style={{
                  backgroundColor: "#0f0f0f",
                  border: "1px solid #1dd1a1",
                  borderRadius: "8px",
                  padding: "15px",
                  marginTop: "20px",
                  textAlign: "center"
                }}>
                  <p style={{ color: "#1dd1a1", fontSize: "1.1rem", margin: "0" }}>
                    Rutina completada exitosamente
                  </p>
                </div>
              </div>

              <Link href="/routines" style={{ display: "block", marginTop: "20px" }}>
                <button style={{
                  width: "100%",
                  padding: "12px 20px",
                  backgroundColor: "#2a2a2a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#444";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#2a2a2a";
                }}
                >
                  ← Volver a Mis Rutinas
                </button>
              </Link>
            </>
          )}
        </div>
      </Layout>
    );
  }
}
