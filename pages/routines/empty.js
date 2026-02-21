import Layout from "../../components/Layout";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../context/UserContext";
import { exercisesList } from "../../data/exercises";
import ExerciseSelector from "../../components/ExerciseSelector";

export default function EmptyRoutine() {
  const router = useRouter();
  const { theme, activeRoutine, startRoutine, endRoutine, saveCompletedWorkout, t } = useUser();
  const isDark = theme === 'dark';
  const mint = "#2EE6C5";
  
  const [routine, setRoutine] = useState({
    name: "Entrenamiento Vacío",
    exercises: []
  });
  const [workoutState, setWorkoutState] = useState("preview"); // preview, ongoing, completed
  const [seriesCompleted, setSeriesCompleted] = useState({});
  const [seriesTypes, setSeriesTypes] = useState({});
  const [currentReps, setCurrentReps] = useState({});
  const [currentWeight, setCurrentWeight] = useState({});
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [activeExerciseMenu, setActiveExerciseMenu] = useState(null);
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState(null);
  const [substitutingExerciseIdx, setSubstitutingExerciseIdx] = useState(null);
  const [openTimePickerId, setOpenTimePickerId] = useState(null);
  const [showTypeSelector, setShowTypeSelector] = useState(null);
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [finishFormData, setFinishFormData] = useState({
    name: 'Entrenamiento Vacío',
    comments: '',
    totalTime: 0
  });
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerLoaded, setIsTimerLoaded] = useState(false);
  const [backgroundTimerActive, setBackgroundTimerActive] = useState(false);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restCountdown, setRestCountdown] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showRoutineActiveAlert, setShowRoutineActiveAlert] = useState(false);

  // Load persistent state on mount
  useEffect(() => {
    const savedState = localStorage.getItem('workoutTimerState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        const { 
          elapsedTime: saved, 
          isActive, 
          routineId: savedRoutineId,
          seriesCompleted: savedSeries,
          seriesTypes: savedTypes,
          currentReps: savedReps,
          currentWeight: savedWeights,
          routine: savedRoutine,
          restTimerActive: savedRestActive,
          restCountdown: savedRestCountdown
        } = parsed;
        
        if (savedRoutineId === "empty") {
          const lastSaveTime = localStorage.getItem('workoutTimerLastSave');
          let currentElapsed = saved;
          let currentRest = savedRestCountdown || 0;
          
          if (lastSaveTime) {
            const timePassed = Math.floor((Date.now() - parseInt(lastSaveTime)) / 1000);
            if (isActive) {
              currentElapsed = saved + timePassed;
            }
            if (savedRestActive && currentRest > 0) {
              currentRest = Math.max(0, currentRest - timePassed);
            }
          }
          
          setElapsedTime(currentElapsed);
          if (savedSeries) setSeriesCompleted(savedSeries);
          if (savedTypes) setSeriesTypes(savedTypes);
          if (savedReps) setCurrentReps(savedReps);
          if (savedWeights) setCurrentWeight(savedWeights);
          if (savedRoutine) setRoutine(savedRoutine);
          if (savedRestActive && currentRest > 0) {
            setRestCountdown(currentRest);
            setRestTimerActive(true);
          }

          if (isActive) {
            setBackgroundTimerActive(true);
            setWorkoutState("ongoing");
          }
        }
      } catch (e) {
        console.error("Error restoring workout state", e);
      }
    }
    setIsTimerLoaded(true);
    
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Save workout state periodically
  useEffect(() => {
    if (!isTimerLoaded || workoutState === "preview") return;

    const saveWorkoutState = () => {
      const state = {
        elapsedTime,
        isActive: backgroundTimerActive,
        routineId: "empty",
        seriesCompleted,
        seriesTypes,
        currentReps,
        currentWeight,
        routine,
        restTimerActive,
        restCountdown
      };
      localStorage.setItem('workoutTimerState', JSON.stringify(state));
      localStorage.setItem('workoutTimerLastSave', Date.now().toString());
    };

    saveWorkoutState();
    const interval = setInterval(saveWorkoutState, 1000);
    
    const handleBeforeUnload = () => {
      saveWorkoutState();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveWorkoutState();
    };
  }, [elapsedTime, backgroundTimerActive, isTimerLoaded, seriesCompleted, seriesTypes, currentReps, currentWeight, routine, workoutState, restTimerActive, restCountdown]);

  // Background timer
  useEffect(() => {
    let interval;
    if (backgroundTimerActive) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [backgroundTimerActive]);

  // Auto-start timer if active routine matches
  useEffect(() => {
    if (activeRoutine && activeRoutine.id === "empty" && workoutState === "preview") {
      setWorkoutState("ongoing");
      setBackgroundTimerActive(true);
    }
  }, [activeRoutine, workoutState]);

  // Rest timer
  useEffect(() => {
    let interval;
    if (restTimerActive && restCountdown > 0) {
      interval = setInterval(() => {
        setRestCountdown((prev) => prev - 1);
      }, 1000);
    } else if (restCountdown === 0 && restTimerActive) {
      setRestTimerActive(false);
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    }
    return () => clearInterval(interval);
  }, [restTimerActive, restCountdown]);



  const formatRestTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  const stopRestTimer = () => {
    setRestTimerActive(false);
    setRestCountdown(0);
  };

  const addRestTime = () => {
    setRestCountdown((prev) => prev + 10);
  };

  const subtractRestTime = () => {
    setRestCountdown((prev) => Math.max(0, prev - 10));
  };

  const FloatingTimerUI = () => {
    if ((workoutState !== "ongoing" && !restTimerActive) || workoutState === "completed") return null;

    return (
      <div style={{ 
        position: "fixed", 
        bottom: isMobile ? "90px" : "30px", 
        left: "50%", 
        transform: "translateX(-50%)", 
        backgroundColor: restTimerActive ? mint : "#1a1a1a", 
        color: restTimerActive ? "#000" : "#fff", 
        padding: "10px 20px", 
        borderRadius: "30px", 
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)", 
        display: "flex",
        alignItems: "center",
        gap: "15px",
        zIndex: 9999,
        border: restTimerActive ? "none" : `2px solid ${mint}`,
        minWidth: "200px",
        justifyContent: "center",
        transition: "all 0.3s ease"
      }}>
        {restTimerActive ? (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); subtractRestTime(); }}
              style={{ background: "rgba(0,0,0,0.1)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center" }}
            >-</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.7 }}>Descanso</span>
              <span style={{ fontWeight: "bold", minWidth: "80px", textAlign: "center", fontSize: '1.1rem' }}>{formatRestTime(restCountdown)}</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); addRestTime(); }}
              style={{ background: "rgba(0,0,0,0.1)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center" }}
            >+</button>
            <button 
              onClick={(e) => { e.stopPropagation(); stopRestTimer(); }}
              style={{ background: "#000", color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", marginLeft: "5px" }}
            >×</button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', color: mint }}>Tiempo Total</span>
            <span style={{ fontWeight: "bold", fontSize: '1.1rem' }}>{formatElapsedTime(elapsedTime)}</span>
          </div>
        )}
      </div>
    );
  };

  const startRestTimer = (seconds) => {
    setRestCountdown(seconds);
    setRestTimerActive(true);
  };

  const formatElapsedTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    let parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  const handleUpdateReps = (exIdx, serieIdx, newReps) => {
    setCurrentReps({ ...currentReps, [`${exIdx}-${serieIdx}`]: newReps });
  };

  const handleUpdateWeight = (exIdx, serieIdx, newWeight) => {
    setCurrentWeight({ ...currentWeight, [`${exIdx}-${serieIdx}`]: newWeight });
  };

  const handleAddSeries = (exIdx) => {
    const updatedExercises = [...routine.exercises];
    updatedExercises[exIdx].series.push({ reps: "", weight: "" });
    setRoutine({ ...routine, exercises: updatedExercises });
    
    const newKey = `${exIdx}-${updatedExercises[exIdx].series.length - 1}`;
    setSeriesCompleted({ ...seriesCompleted, [newKey]: false });
    setSeriesTypes({ ...seriesTypes, [newKey]: "N" });
  };

  const handleDeleteSeries = (exIdx, serieIdx) => {
    const updatedExercises = [...routine.exercises];
    updatedExercises[exIdx].series = updatedExercises[exIdx].series.filter((_, i) => i !== serieIdx);
    setRoutine({ ...routine, exercises: updatedExercises });
    
    // Simplificado: En producción se debería re-indexar como en [id].js
  };

  const handleAddExercise = () => {
    setShowExerciseSelector(true);
  };

  const handleSelectExercise = (exercise) => {
    const newExercise = {
      name: exercise.name,
      type: exercise.type || "weight_reps",
      rest: 60,
      series: [{ reps: 10, weight: 0 }]
    };
    
    let updatedExercises;
    let targetIdx;

    if (substitutingExerciseIdx !== null) {
      updatedExercises = [...routine.exercises];
      updatedExercises[substitutingExerciseIdx] = newExercise;
      targetIdx = substitutingExerciseIdx;
    } else {
      updatedExercises = [...routine.exercises, newExercise];
      targetIdx = updatedExercises.length - 1;
    }

    setRoutine({ ...routine, exercises: updatedExercises });
    const newKey = `${targetIdx}-0`;
    setSeriesCompleted({ ...seriesCompleted, [newKey]: false });
    setSeriesTypes({ ...seriesTypes, [newKey]: "N" });
    setCurrentReps({ ...currentReps, [newKey]: 10 });
    setCurrentWeight({ ...currentWeight, [newKey]: 0 });
    
    setShowExerciseSelector(false);
    setSubstitutingExerciseIdx(null);
  };

  const handleDeleteExercise = (exIdx) => {
    const updatedExercises = routine.exercises.filter((_, i) => i !== exIdx);
    setRoutine({ ...routine, exercises: updatedExercises });
  };

  const getExerciseInfo = (name) => {
    for (const group in exercisesList) {
      const ex = exercisesList[group].find(e => e.name === name);
      if (ex) return ex;
    }
    return null;
  };

  const handleCompleteWorkout = () => setShowFinishConfirmation(true);

  const clearPersistentTimer = () => {
    localStorage.removeItem('workoutTimerState');
    localStorage.removeItem('workoutTimerLastSave');
    setElapsedTime(0);
    setBackgroundTimerActive(false);
  };

  const handleDiscardWorkout = () => {
    clearPersistentTimer();
    endRoutine();
    router.push('/routines');
  };

  const handleConfirmFinish = () => {
    setShowFinishConfirmation(false);
    setFinishFormData({
      ...finishFormData,
      totalTime: Math.floor(elapsedTime / 60)
    });
    setShowFinishForm(true);
  };

  const handleSaveFinishedRoutine = () => {
    clearPersistentTimer();
    
    const totalSeries = routine.exercises.reduce((sum, ex) => sum + ex.series.length, 0);
    const totalVolume = Object.keys(seriesCompleted).reduce((sum, key) => {
      if (!seriesCompleted[key]) return sum;
      return sum + (parseFloat(currentWeight[key] || 0) * parseInt(currentReps[key] || 0));
    }, 0);

    const completedRoutine = {
      id: Date.now(),
      name: finishFormData.name,
      comments: finishFormData.comments,
      completedAt: new Date().toISOString(),
      elapsedTime,
      exercises: routine.exercises.length,
      series: totalSeries,
      totalVolume,
      exerciseDetails: routine.exercises.map((ex, exIdx) => {
        // Find muscle group for this exercise
        let muscleGroup = "";
        for (const [group, exercises] of Object.entries(exercisesList)) {
          if (exercises.some(e => e.name === ex.name)) {
            muscleGroup = group;
            break;
          }
        }

        return {
          name: ex.name,
          muscleGroup: muscleGroup,
          series: ex.series.map((s, sIdx) => ({
            reps: currentReps[`${exIdx}-${sIdx}`] || s.reps,
            weight: currentWeight[`${exIdx}-${sIdx}`] || s.weight
          }))
        };
      })
    };

    saveCompletedWorkout(completedRoutine);
    setSavingWorkout(true);
    endRoutine();
    setTimeout(() => router.push('/routines?tab=completed'), 1500);
  };

  if (showDiscardConfirm) {
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
            backgroundColor: "#1a1a1a",
            borderRadius: "15px",
            padding: "40px",
            width: "320px",
            textAlign: "center",
            border: "2px solid #ff4d4d",
            maxWidth: "100%",
            boxSizing: "border-box"
          }}>
            <h3 style={{ color: "#fff", margin: "0 0 15px 0", fontSize: "1.2rem" }}>¿Cancelar entrenamiento?</h3>
            <p style={{ color: "#aaa", fontSize: "0.95rem", marginBottom: "25px", lineHeight: "1.4" }}>
              Se perderán todos los datos registrados en esta sesión.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => setShowDiscardConfirm(false)} 
                style={{ flex: 1, padding: "12px", backgroundColor: "#333", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
              >
                No, continuar
              </button>
              <button 
                onClick={handleDiscardWorkout} 
                style={{ flex: 1, padding: "12px", backgroundColor: "#ff4d4d", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (showDeleteExerciseConfirm !== null) {
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
            backgroundColor: "#1a1a1a",
            borderRadius: "12px",
            padding: "40px",
            width: "320px",
            textAlign: "center",
            border: "1px solid #333",
            maxWidth: "100%",
            boxSizing: "border-box"
          }}>
            <h3 style={{ color: "#fff", margin: "0 0 15px 0", fontSize: "1.2rem" }}>¿Eliminar ejercicio?</h3>
            <p style={{ color: "#aaa", fontSize: "0.9rem", marginBottom: "25px" }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowDeleteExerciseConfirm(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleDeleteExercise(showDeleteExerciseConfirm);
                  setShowDeleteExerciseConfirm(null);
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#ff4d4d",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (workoutState === "preview") {
    return (
      <Layout>
        <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ color: isDark ? "#fff" : "#333" }}>Entrenamiento Vacío</h1>
          <p style={{ color: "#aaa", marginBottom: "30px" }}>Empieza un entrenamiento desde cero agregando ejercicios sobre la marcha.</p>
          <button
            onClick={() => {
              if (activeRoutine && activeRoutine.id !== "empty") {
                setShowRoutineActiveAlert(true);
              } else {
                clearPersistentTimer();
                setWorkoutState("ongoing");
                setBackgroundTimerActive(true);
                startRoutine({ id: "empty", name: "Entrenamiento Vacío", path: "/routines/empty" });
              }
            }}
            style={{
              backgroundColor: mint,
              color: "#000",
              border: "none",
              borderRadius: "10px",
              padding: "15px 40px",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Empezar Entrenamiento
          </button>

          {showRoutineActiveAlert && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(0,0,0,0.8)", display: "flex",
              justifyContent: "center", alignItems: "center", zIndex: 3000
            }}>
              <div style={{
                backgroundColor: "#1a1a1a", borderRadius: "15px", padding: "30px", width: "320px",
                textAlign: "center", border: "2px solid #ff4d4d"
              }}>
                <h3 style={{ color: "#fff", margin: "0 0 15px 0" }}>Ya tienes una rutina iniciada</h3>
                <p style={{ color: "#aaa", fontSize: "0.95rem", marginBottom: "25px" }}>
                  Debes terminar o cancelar la rutina de <strong>{activeRoutine?.name}</strong> antes de empezar una nueva.
                </p>
                <button onClick={() => setShowRoutineActiveAlert(false)} style={{ width: "100%", padding: "12px", backgroundColor: mint, border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}>Entendido</button>
              </div>
            </div>
          )}
        </div>

        <FloatingTimerUI />
      </Layout>
    );
  }

  if (showFinishConfirmation) {
    return (
      <Layout>
        <div style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
          <div style={{ backgroundColor: "#1a1a1a", border: `2px solid ${mint}`, borderRadius: "12px", padding: "40px", textAlign: "center", maxWidth: "400px" }}>
            <h2 style={{ color: mint, marginBottom: "20px" }}>¿Terminar entreno?</h2>
            <div style={{ display: "flex", gap: "15px" }}>
              <button onClick={() => setShowFinishConfirmation(false)} style={{ flex: 1, padding: "12px", background: "#333", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>No</button>
              <button onClick={handleConfirmFinish} style={{ flex: 1, padding: "12px", background: mint, color: "#000", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Sí, terminar</button>
            </div>
          </div>
        </div>

        <FloatingTimerUI />
      </Layout>
    );
  }

  if (showFinishForm) {
    return (
      <Layout>
        <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ backgroundColor: "#1a1a1a", border: `1px solid ${mint}`, borderRadius: "12px", padding: "30px" }}>
            <h2 style={{ color: mint, textAlign: "center", marginBottom: "30px" }}>Finalizar Entrenamiento</h2>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#aaa", fontSize: "0.9rem", display: "block", marginBottom: "8px" }}>Nombre del entreno</label>
              <input type="text" value={finishFormData.name} onChange={(e) => setFinishFormData({...finishFormData, name: e.target.value})} style={{ width: "100%", padding: "12px", background: "#000", border: "1px solid #333", borderRadius: "6px", color: "#fff" }} />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#aaa", fontSize: "0.9rem", display: "block", marginBottom: "8px" }}>Comentarios</label>
              <textarea value={finishFormData.comments} onChange={(e) => setFinishFormData({...finishFormData, comments: e.target.value})} style={{ width: "100%", padding: "12px", background: "#000", border: "1px solid #333", borderRadius: "6px", color: "#fff", minHeight: "80px" }} />
            </div>
            <div style={{ display: "flex", gap: "15px", marginTop: "30px" }}>
              <button onClick={() => setShowFinishForm(false)} style={{ flex: 1, padding: "12px", background: "#333", color: "#fff", border: "none", borderRadius: "8px" }}>Cancelar</button>
              <button onClick={handleSaveFinishedRoutine} style={{ flex: 1, padding: "12px", background: mint, color: "#000", border: "none", borderRadius: "8px", fontWeight: "bold" }}>{savingWorkout ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>

        <FloatingTimerUI />
      </Layout>
    );
  }

  const totalCompletedSeries = Object.keys(seriesCompleted).filter(key => seriesCompleted[key]).length;
  const totalVolume = Object.keys(seriesCompleted).reduce((sum, key) => {
    if (!seriesCompleted[key]) return sum;
    return sum + (parseFloat(currentWeight[key] || 0) * parseInt(currentReps[key] || 0));
  }, 0);

  if (showExerciseSelector) {
    return (
      <Layout>
        <ExerciseSelector
          onSelectExercise={handleSelectExercise}
          onCancel={() => setShowExerciseSelector(false)}
        />
      </Layout>
    );
  }

  return (
    <Layout hideBottomNav={workoutState === "ongoing"}>
      <div style={{ padding: 0, maxWidth: "900px", margin: "0 auto", backgroundColor: "#000", minHeight: "100vh", color: "#fff" }}>
        {/* Header */}
        <div style={{ padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, backgroundColor: "#000", zIndex: 1002 }}>
          <div 
            onClick={() => setShowDiscardConfirm(true)}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
          >
            <span style={{ fontSize: "1.2rem", color: "#fff" }}>∨</span>
            <span style={{ fontSize: "1.1rem", fontWeight: "500" }}>Entreno Vacío</span>
          </div>
          <button onClick={handleCompleteWorkout} style={{ backgroundColor: mint, color: "#000", border: "none", borderRadius: "8px", padding: "8px 16px", fontWeight: "600", cursor: "pointer" }}>Terminar</button>
        </div>

        {/* Modal de Confirmación para Descartar/Cancelar */}
        {showDiscardConfirm && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.8)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 3000
          }}>
            <div style={{
              backgroundColor: "#1a1a1a", borderRadius: "15px", padding: "30px", width: "320px",
              textAlign: "center", border: "2px solid #ff4d4d"
            }}>
              <h3 style={{ color: "#fff", margin: "0 0 15px 0" }}>¿Cancelar entrenamiento?</h3>
              <p style={{ color: "#aaa", fontSize: "0.95rem", marginBottom: "25px" }}>
                Se perderán todos los datos registrados en esta sesión.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => setShowDiscardConfirm(false)} 
                  style={{ flex: 1, padding: "12px", backgroundColor: "#333", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
                >
                  No, continuar
                </button>
                <button 
                  onClick={handleDiscardWorkout} 
                  style={{ flex: 1, padding: "12px", backgroundColor: "#ff4d4d", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Sí, cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 20px 20px 20px", borderBottom: "1px solid #1a1a1a" }}>
          <div>
            <div style={{ color: "#666", fontSize: "0.75rem", marginBottom: "4px" }}>Duración</div>
            <div style={{ color: mint, fontSize: "1.1rem", fontWeight: "500" }}>{formatElapsedTime(elapsedTime)}</div>
          </div>
          <div>
            <div style={{ color: "#666", fontSize: "0.75rem", marginBottom: "4px" }}>Volumen</div>
            <div style={{ color: "#fff", fontSize: "1.1rem", fontWeight: "500" }}>{totalVolume.toLocaleString()} kg</div>
          </div>
          <div>
            <div style={{ color: "#666", fontSize: "0.75rem", marginBottom: "4px" }}>Series</div>
            <div style={{ color: "#fff", fontSize: "1.1rem", fontWeight: "500" }}>{totalCompletedSeries}</div>
          </div>
        </div>

        <div style={{ padding: "20px 15px" }}>
          {routine.exercises.map((exercise, exIdx) => {
            const exerciseInfo = getExerciseInfo(exercise.name);
            const isTimeBased = exerciseInfo?.type === 'time';
            const isLastre = exerciseInfo?.unit === 'lastre';
            
            return (
            <div key={exIdx} style={{ marginBottom: "40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h2 style={{ margin: 0, color: mint, fontSize: "1.15rem", fontWeight: "500" }}>{t(exercise.name)}</h2>
                <button onClick={() => handleDeleteExercise(exIdx)} style={{ background: "none", border: "none", color: "#ff4d4d", fontSize: "1.2rem" }}>×</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 70px 70px 45px", gap: "10px", marginBottom: "10px", color: "#666", fontSize: "0.75rem", fontWeight: "600" }}>
                <div>SERIE</div>
                <div>ANTERIOR</div>
                <div style={{ textAlign: "center" }}>{isTimeBased ? "TIEMPO" : isLastre ? "LASTRE" : "KG"}</div>
                <div style={{ textAlign: "center" }}>{isTimeBased ? "KM/H" : "REPS"}</div>
                <div style={{ textAlign: "right" }}>✓</div>
              </div>

              {exercise.series.map((serie, sIdx) => {
                const key = `${exIdx}-${sIdx}`;
                const isCompleted = seriesCompleted[key];
                return (
                  <div key={sIdx} style={{ display: "grid", gridTemplateColumns: "50px 1fr 70px 70px 45px", gap: "10px", alignItems: "center", marginBottom: "5px" }}>
                    <div style={{ color: "#fff", textAlign: "center", backgroundColor: "#1a1a1a", borderRadius: "4px", padding: "4px 0" }}>{sIdx + 1}</div>
                    <div style={{ color: "#666", fontSize: "0.9rem" }}>—</div>
                    <input type="number" value={currentWeight[key] || ""} onChange={(e) => handleUpdateWeight(exIdx, sIdx, e.target.value)} style={{ width: "100%", background: isCompleted ? "rgba(46, 230, 197, 0.1)" : "#1a1a1a", border: "none", borderRadius: "4px", color: "#fff", textAlign: "center", padding: "6px 0" }} />
                    <input type="number" value={currentReps[key] || ""} onChange={(e) => handleUpdateReps(exIdx, sIdx, e.target.value)} style={{ width: "100%", background: isCompleted ? "rgba(46, 230, 197, 0.1)" : "#1a1a1a", border: "none", borderRadius: "4px", color: "#fff", textAlign: "center", padding: "6px 0" }} />
                    <button 
                      onClick={() => {
                        const isNowCompleted = !isCompleted;
                        setSeriesCompleted({...seriesCompleted, [key]: isNowCompleted});
                        if (isNowCompleted && exercise.rest) startRestTimer(exercise.rest);
                      }} 
                      style={{ width: "100%", height: "32px", borderRadius: "6px", backgroundColor: isCompleted ? mint : "#333", color: isCompleted ? "#000" : "#666", border: "none" }}
                    >✓</button>
                  </div>
                );
              })}
              <button onClick={() => handleAddSeries(exIdx)} style={{ width: "100%", padding: "10px", backgroundColor: "#1a1a1a", color: "#fff", border: "none", borderRadius: "8px", marginTop: "10px" }}>+ Agregar Serie</button>
            </div>
          );})}

          <button onClick={handleAddExercise} style={{ width: "100%", padding: "15px", backgroundColor: "#1a1a1a", color: mint, border: `1px dashed ${mint}`, borderRadius: "10px", fontWeight: "600" }}>+ Agregar Ejercicio</button>
        </div>

        {/* Exercise Selector Modal */}
        {showExerciseSelector && (
          <ExerciseSelector
            onSelectExercise={handleSelectExercise}
            onCancel={() => setShowExerciseSelector(false)}
          />
        )}

      </div>

      <FloatingTimerUI />
    </Layout>
  );
}
