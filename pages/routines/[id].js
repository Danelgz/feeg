import Layout from "../../components/Layout";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../context/UserContext";
import { exercisesList } from "../../data/exercises";

export default function RoutineDetail() {
  const router = useRouter();
  const { theme, routines: allRoutines, activeRoutine, startRoutine, endRoutine, saveCompletedWorkout, updateCompletedWorkout, completedWorkouts, t } = useUser();
  const isDark = theme === 'dark';
  const mint = "#2EE6C5";
  const mintSoft = "rgba(46, 230, 197, 0.12)";
  const surface = isDark ? "#141414" : "#fff";
  const surface2 = isDark ? "#0f0f0f" : "#f9f9f9";
  const { id, editWorkoutId, viewWorkoutId } = router.query;
  const [routine, setRoutine] = useState(null);
  const [isEditingOldWorkout, setIsEditingOldWorkout] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [workoutState, setWorkoutState] = useState("preview"); // preview, ongoing, completed
  const [seriesCompleted, setSeriesCompleted] = useState({});
  const [seriesTypes, setSeriesTypes] = useState({}); // "W", "N", "D"
  const [currentReps, setCurrentReps] = useState({});
  const [currentWeight, setCurrentWeight] = useState({});
  const [restTime, setRestTime] = useState(null);
  const [editingRestTime, setEditingRestTime] = useState(false);
  const [tempRestTime, setTempRestTime] = useState("");
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [activeExerciseMenu, setActiveExerciseMenu] = useState(null); // exIdx
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState(null); // exIdx
  const [substitutingExerciseIdx, setSubstitutingExerciseIdx] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [exercisesData, setExercisesData] = useState(null);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [countdownActive, setCountdownActive] = useState(false);
  const [openTimePickerId, setOpenTimePickerId] = useState(null);
  const [showTypeSelector, setShowTypeSelector] = useState(null); // { exIdx, serieIdx }
  const [wheelScrollPositions, setWheelScrollPositions] = useState({});
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [finishFormData, setFinishFormData] = useState({
    name: '',
    comments: '',
    totalTime: 0
  });
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [showRoutineActiveAlert, setShowRoutineActiveAlert] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(null); // exerciseName
  const [selectedGraphPoint, setSelectedGraphPoint] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerLoaded, setIsTimerLoaded] = useState(false);
  const [backgroundTimerActive, setBackgroundTimerActive] = useState(false);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restCountdown, setRestCountdown] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [previousData, setPreviousData] = useState({}); // key: exerciseName, value: { weight, reps }

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
          routine: savedRoutine
        } = parsed;
        
        if (savedRoutineId === id?.toString()) {
          const lastSaveTime = localStorage.getItem('workoutTimerLastSave');
          let currentElapsed = saved;
          
          if (lastSaveTime && isActive) {
            const additionalTime = Math.floor((Date.now() - parseInt(lastSaveTime)) / 1000);
            currentElapsed = saved + additionalTime;
          }
          
          setElapsedTime(currentElapsed);
          if (savedSeries) setSeriesCompleted(savedSeries);
          if (savedTypes) setSeriesTypes(savedTypes);
          if (savedReps) setCurrentReps(savedReps);
          if (savedWeights) setCurrentWeight(savedWeights);
          if (savedRoutine) setRoutine(savedRoutine);

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
  }, [id]);

  // Save workout state periodically and on unmount
  useEffect(() => {
    if (!isTimerLoaded || !id || workoutState === "preview" || isReadOnly) return;

    const saveWorkoutState = () => {
      const state = {
        elapsedTime,
        isActive: backgroundTimerActive,
        routineId: id.toString(),
        seriesCompleted,
        seriesTypes,
        currentReps,
        currentWeight,
        routine
      };
      localStorage.setItem('workoutTimerState', JSON.stringify(state));
      localStorage.setItem('workoutTimerLastSave', Date.now().toString());
    };

    saveWorkoutState();
    const interval = setInterval(saveWorkoutState, 1000);
    
    return () => {
      clearInterval(interval);
      saveWorkoutState();
    };
  }, [elapsedTime, backgroundTimerActive, id, isTimerLoaded, seriesCompleted, seriesTypes, currentReps, currentWeight, routine, workoutState]);

  // Load previous performance data
  useEffect(() => {
    if (completedWorkouts && routine) {
      const prevData = {};
      routine.exercises.forEach(ex => {
        // Find last workout that contained this exercise
        const lastWorkout = completedWorkouts.find(w => 
          w.exerciseDetails && w.exerciseDetails.some(ed => ed.name === ex.name)
        );
        
        if (lastWorkout) {
          const exDetail = lastWorkout.exerciseDetails.find(ed => ed.name === ex.name);
          // Store all series for this exercise
          prevData[ex.name] = exDetail.series;
        }
      });
      setPreviousData(prevData);
    }
  }, [completedWorkouts, routine]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const getExerciseHistory = (exerciseName) => {
    if (!completedWorkouts) return [];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const historyMap = {}; // Mantener solo el peso máximo por día
    
    completedWorkouts.forEach(w => {
      if (!w.completedAt) return;
      const workoutDate = new Date(w.completedAt);
      if (workoutDate >= thirtyDaysAgo) {
        const details = w.exerciseDetails || w.details || [];
        const exDetail = details.find(ed => (ed.name || ed.exercise) === exerciseName);
        if (exDetail && Array.isArray(exDetail.series)) {
          const maxWeight = Math.max(...exDetail.series.map(s => parseFloat(s.weight) || 0));
          if (maxWeight > 0) {
            const dateKey = workoutDate.toDateString();
            if (!historyMap[dateKey] || historyMap[dateKey].weight < maxWeight) {
              historyMap[dateKey] = {
                date: workoutDate,
                weight: maxWeight,
                formattedDate: `${workoutDate.getDate()}/${workoutDate.getMonth() + 1}`
              };
            }
          }
        }
      }
    });
    
    return Object.values(historyMap).sort((a, b) => a.date - b.date);
  };

  const handleUpdateReps = (exIdx, serieIdx, newReps) => {
    const key = `${exIdx}-${serieIdx}`;
    setCurrentReps({
      ...currentReps,
      [key]: newReps
    });
  };

  const handleUpdateWeight = (exIdx, serieIdx, newWeight) => {
    const key = `${exIdx}-${serieIdx}`;
    setCurrentWeight({
      ...currentWeight,
      [key]: newWeight
    });
  };

  const handleAddSeries = (exIdx) => {
    const updatedExercises = [...routine.exercises];
    const updatedExercise = { ...updatedExercises[exIdx] };
    updatedExercise.series = [...updatedExercise.series, { reps: "", weight: "" }];
    updatedExercises[exIdx] = updatedExercise;
    
    setRoutine({ ...routine, exercises: updatedExercises });
    
    // Initialize tracking for new series
    const newKey = `${exIdx}-${updatedExercise.series.length - 1}`;
    setSeriesCompleted({ ...seriesCompleted, [newKey]: false });
    setSeriesTypes({ ...seriesTypes, [newKey]: "N" });
    setCurrentReps({ ...currentReps, [newKey]: "" });
    setCurrentWeight({ ...currentWeight, [newKey]: "" });
  };

  const handleDeleteSeries = (exIdx, serieIdx) => {
    const updatedExercises = [...routine.exercises];
    const updatedExercise = { ...updatedExercises[exIdx] };
    updatedExercise.series = updatedExercise.series.filter((_, i) => i !== serieIdx);
    updatedExercises[exIdx] = updatedExercise;
    
    setRoutine({ ...routine, exercises: updatedExercises });
    
    // Clean up tracking objects for deleted series
    const newSeriesCompleted = {};
    const newSeriesTypes = {};
    const newCurrentReps = {};
    const newCurrentWeight = {};
    
    Object.keys(seriesCompleted).forEach((key) => {
      const [eIdx, sIdx] = key.split("-").map(Number);
      if (eIdx === exIdx) {
        if (sIdx < serieIdx) {
          newSeriesCompleted[key] = seriesCompleted[key];
          newSeriesTypes[key] = seriesTypes[key];
          newCurrentReps[key] = currentReps[key];
          newCurrentWeight[key] = currentWeight[key];
        } else if (sIdx > serieIdx) {
          const newKey = `${eIdx}-${sIdx - 1}`;
          newSeriesCompleted[newKey] = seriesCompleted[key];
          newSeriesTypes[newKey] = seriesTypes[key];
          newCurrentReps[newKey] = currentReps[key];
          newCurrentWeight[newKey] = currentWeight[key];
        }
      } else {
        newSeriesCompleted[key] = seriesCompleted[key];
        newSeriesTypes[key] = seriesTypes[key];
        newCurrentReps[key] = currentReps[key];
        newCurrentWeight[key] = currentWeight[key];
      }
    });
    
    setSeriesCompleted(newSeriesCompleted);
    setSeriesTypes(newSeriesTypes);
    setCurrentReps(newCurrentReps);
    setCurrentWeight(newCurrentWeight);
  };

  useEffect(() => {
    if (isTimerLoaded && id !== undefined && allRoutines && workoutState === "preview") {
      // Si estamos editando o viendo un entrenamiento existente
      const targetId = editWorkoutId || viewWorkoutId;
      if (targetId && completedWorkouts) {
        const oldWorkout = completedWorkouts.find(w => w.id.toString() === targetId.toString());
        if (oldWorkout) {
          const rawExercises = oldWorkout.details || oldWorkout.exerciseDetails || oldWorkout.exercises || [];
          const exercises = Array.isArray(rawExercises) ? rawExercises : [];
          
          setRoutine({
            id: oldWorkout.routineId || id,
            name: oldWorkout.name,
            exercises: exercises.map(ex => ({
              ...ex,
              group: ex.group || ex.muscleGroup || "Otros",
              series: Array.isArray(ex.series) ? ex.series : []
            }))
          });
          
          const seriesTracker = {};
          const typeTracker = {};
          const repsTracker = {};
          const weightTracker = {};
          
          exercises.forEach((ex, exIdx) => {
            if (ex.series) {
              ex.series.forEach((serie, serieIdx) => {
                const key = `${exIdx}-${serieIdx}`;
                seriesTracker[key] = true; // Marcar como completadas ya que es un entreno viejo
                typeTracker[key] = serie.type || "N";
                repsTracker[key] = serie.reps || "";
                weightTracker[key] = serie.weight || "";
              });
            }
          });
          
          setSeriesCompleted(seriesTracker);
          setSeriesTypes(typeTracker);
          setCurrentReps(repsTracker);
          setCurrentWeight(weightTracker);
          setElapsedTime(oldWorkout.elapsedTime || (oldWorkout.totalTime * 60) || 0);
          
          if (viewWorkoutId) {
            setIsReadOnly(true);
            setWorkoutState("ongoing");
          } else {
            setIsEditingOldWorkout(true);
            setWorkoutState("ongoing");
          }
          return;
        }
      }

      const foundRoutine = allRoutines.find(r => r.id.toString() === id.toString());
      if (foundRoutine) {
        setRoutine(foundRoutine);
        // Initialize tracking objects
        const seriesTracker = {};
        const typeTracker = {};
        const repsTracker = {};
        const weightTracker = {};
        
        foundRoutine.exercises.forEach((ex, exIdx) => {
          ex.series.forEach((serie, serieIdx) => {
            const key = `${exIdx}-${serieIdx}`;
            seriesTracker[key] = false;
            typeTracker[key] = "N";
            repsTracker[key] = serie.reps || "";
            weightTracker[key] = serie.weight || "";
          });
        });
        
        setSeriesCompleted(seriesTracker);
        setSeriesTypes(typeTracker);
        setCurrentReps(repsTracker);
        setCurrentWeight(weightTracker);
        setRestTime(foundRoutine.exercises[0]?.rest || 60);
      }
    }
  }, [id, allRoutines, workoutState, isTimerLoaded]);

  // Background workout timer effect
  useEffect(() => {
    let interval;
    if (backgroundTimerActive) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [backgroundTimerActive]);

  // Ensure timer is always active when workout is ongoing
  useEffect(() => {
    if (workoutState === "ongoing" && !backgroundTimerActive && !isReadOnly) {
      setBackgroundTimerActive(true);
    }
  }, [workoutState, backgroundTimerActive, isReadOnly]);

  // Auto-start timer and workout when routine is activated
  useEffect(() => {
    if (activeRoutine && activeRoutine.id?.toString?.() === id?.toString?.() && workoutState === "preview") {
      setWorkoutState("ongoing");
      setBackgroundTimerActive(true); // Start timer immediately
    }
  }, [id, activeRoutine, workoutState]);

  useEffect(() => {
    let interval;
    if (restTimerActive && restCountdown > 0) {
      interval = setInterval(() => {
        setRestCountdown((prev) => prev - 1);
      }, 1000);
    } else if (restCountdown === 0 && restTimerActive) {
      setRestTimerActive(false);
      // Play notification sound or vibrate when rest ends
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
    return () => clearInterval(interval);
  }, [restTimerActive, restCountdown]);

  useEffect(() => {
    let interval;
    if (countdownActive && countdown !== null) {
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
          <p>{t("loading_routine")}</p>
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

  const handleUpdateRestTime = (exIdx, newTime) => {
    const time = parseInt(newTime) || 0;
    const updatedExercises = [...routine.exercises];
    const updatedExercise = { ...updatedExercises[exIdx] };
    updatedExercise.rest = time;
    updatedExercises[exIdx] = updatedExercise;
    setRoutine({ ...routine, exercises: updatedExercises });
  };

  // Timer control functions
  const startBackgroundTimer = () => {
    setBackgroundTimerActive(true);
    if (workoutState !== "ongoing") {
      setWorkoutState("ongoing");
    }
  };

  const stopBackgroundTimer = () => {
    // Don't allow manual stopping - timer only stops when workout is completed
    // This function is kept for compatibility but won't actually stop the timer
  };

  const clearPersistentTimer = () => {
    localStorage.removeItem('workoutTimerState');
    localStorage.removeItem('workoutTimerLastSave');
    setElapsedTime(0);
    setBackgroundTimerActive(false);
  };

  const handleDiscardWorkout = () => {
    clearPersistentTimer();
    endRoutine();
    if (isEditingOldWorkout) {
      router.push('/profile');
    } else {
      router.push('/routines');
    }
  };

  const startRestTimer = (seconds) => {
    setRestCountdown(seconds);
    setRestTimerActive(true);
  };

  const stopRestTimer = () => {
    setRestTimerActive(false);
    setRestCountdown(0);
  };

  const formatRestTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  const handleStartCountdown = (seconds) => {
    setCountdown(seconds);
    setCountdownActive(true);
  };

  const handleAddExercise = () => {
    setExercisesData(exercisesList);
    setShowAddExerciseModal(true);
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
    
    // Initialize tracking for exercise
    const newKey = `${targetIdx}-0`;
    setSeriesCompleted({ ...seriesCompleted, [newKey]: false });
    setCurrentReps({ ...currentReps, [newKey]: 10 });
    setCurrentWeight({ ...currentWeight, [newKey]: 0 });
    
    // Close modal and reset substitution state
    setShowAddExerciseModal(false);
    setSelectedGroup(null);
    setSubstitutingExerciseIdx(null);
  };

  const handleDeleteExercise = (exIdx) => {
    if (routine.exercises.length > 1) {
      const updatedExercises = routine.exercises.filter((_, i) => i !== exIdx);
      setRoutine({ ...routine, exercises: updatedExercises });
      
      if (currentExerciseIndex >= updatedExercises.length) {
        setCurrentExerciseIndex(updatedExercises.length - 1);
      }
      
      // Clean up and RE-INDEX tracking objects
      const newSeriesCompleted = {};
      const newCurrentReps = {};
      const newCurrentWeight = {};
      
      Object.keys(seriesCompleted).forEach((key) => {
        const parts = key.split("-");
        const exIdxKey = parseInt(parts[0]);
        const serIdxKey = parseInt(parts[1]);
        
        if (exIdxKey < exIdx) {
          // Keep same key
          newSeriesCompleted[key] = seriesCompleted[key];
          newCurrentReps[key] = currentReps[key];
          newCurrentWeight[key] = currentWeight[key];
        } else if (exIdxKey > exIdx) {
          // Shift index down
          const newKey = `${exIdxKey - 1}-${serIdxKey}`;
          newSeriesCompleted[newKey] = seriesCompleted[key];
          newCurrentReps[newKey] = currentReps[key];
          newCurrentWeight[newKey] = currentWeight[key];
        }
        // If exIdxKey === exIdx, it is deleted (not added to new objects)
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
    // Clear persistent timer when workout is completed
    clearPersistentTimer();
    
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
      id: isEditingOldWorkout ? Number(editWorkoutId) : Date.now(),
      name: finishFormData.name,
      comments: finishFormData.comments,
      completedAt: isEditingOldWorkout 
        ? completedWorkouts.find(w => w.id.toString() === editWorkoutId.toString())?.completedAt || new Date().toISOString()
        : new Date().toISOString(),
      totalTime: finishFormData.totalTime,
      elapsedTime: elapsedTime,
      exercises: routine.exercises.length,
      series: totalSeries,
      totalReps: totalReps,
      totalVolume: totalVolume,
      details: routine.exercises.map((ex, exIdx) => ({
        name: ex.name,
        group: ex.group || ex.muscleGroup,
        series: ex.series.map((s, sIdx) => ({
          reps: currentReps[`${exIdx}-${sIdx}`] || s.reps,
          weight: currentWeight[`${exIdx}-${sIdx}`] || s.weight,
          type: seriesTypes[`${exIdx}-${sIdx}`] || "N"
        }))
      }))
    };

    // Guardar usando el contexto (esto también sincroniza con la nube)
    if (isEditingOldWorkout) {
      updateCompletedWorkout(completedRoutine);
    } else {
      saveCompletedWorkout(completedRoutine);
    }

    setSavingWorkout(true);
    endRoutine();

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
          <h1 style={{ color: isDark ? "#fff" : "#333" }}>{routine.name}</h1>
          <p style={{ color: isDark ? "#aaa" : "#666", marginBottom: "20px" }}>
            {routine.exercises.length} {t("exercises_count")} · {routine.exercises.reduce((sum, ex) => sum + ex.series.length, 0)} {t("total_series")}
          </p>

          <div style={{
            backgroundColor: isDark ? "#1a1a1a" : "#fff",
            border: `1px solid ${isDark ? "#333" : "#eee"}`,
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
            boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{ marginTop: 0, color: isDark ? "#fff" : "#333" }}>{t("workout_summary")}</h2>
            {routine.exercises.map((exercise, idx) => (
              <div key={idx} style={{
                backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                padding: "12px",
                marginBottom: "10px",
                borderRadius: "6px",
                border: `1px solid ${isDark ? "#2a2a2a" : "#eee"}`
              }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#1dd1a1" }}>{t(exercise.name)}</h3>
                <p style={{ margin: "0", color: isDark ? "#aaa" : "#666" }}>
                  {exercise.series.length} {t("series_label")} · {t("rest_between_series")} {exercise.rest}s
                </p>
                {exercise.series.map((serie, sIdx) => (
                  <div key={sIdx} style={{ fontSize: "0.9rem", color: isDark ? "#999" : "#888", marginLeft: "10px" }}>
                    {t("series_label")} {sIdx + 1}: {serie.reps} {exercise.type === 'time' ? 's' : t("reps_label")}
                    {(exercise.type === 'weight_reps' || !exercise.type) && ` - ${serie.weight}kg`}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              if (activeRoutine && activeRoutine.id?.toString() !== id?.toString()) {
                setShowRoutineActiveAlert(true);
              } else {
                setWorkoutState("ongoing");
                startRoutine({ id: id?.toString?.() || id, name: routine.name, path: `/routines/${id}` });
              }
            }}
            style={{
              ...buttonStyle,
              fontSize: "1.1rem",
              padding: "12px 30px",
              backgroundColor: "#1dd1a1"
            }}
            {...buttonHoverStyle}
          >
            {t("start_routine")}
          </button>

          {showRoutineActiveAlert && (
            <div style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 3000
            }}>
              <div style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "15px",
                padding: "30px",
                width: "320px",
                textAlign: "center",
                border: "2px solid #ff4d4d"
              }}>
                <h3 style={{ color: "#fff", margin: "0 0 15px 0" }}>Ya tienes una rutina iniciada</h3>
                <p style={{ color: "#aaa", fontSize: "0.95rem", marginBottom: "25px", lineHeight: "1.4" }}>
                  Debes terminar o cancelar la rutina de <strong>{activeRoutine?.name}</strong> antes de empezar una nueva.
                </p>
                <button
                  onClick={() => setShowRoutineActiveAlert(false)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: mint,
                    color: "#000",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  Entendido
                </button>
              </div>
            </div>
          )}
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
            border: "2px solid #1dd1a1",
            borderRadius: "12px",
            padding: "40px",
            maxWidth: "500px",
            textAlign: "center",
            boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ color: isDark ? "#1dd1a1" : "#333", marginBottom: "20px", fontSize: "1.5rem" }}>
              {t("confirm_finish_title")}
            </h2>
            <p style={{ color: isDark ? "#ccc" : "#666", marginBottom: "30px" }}>
              {t("confirm_finish_subtitle")}
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
                {t("no_continue")}
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
                {t("yes_finish")}
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
          minHeight: "calc(100vh - 100px)",
          backgroundColor: "#000"
        }}>
          <div style={{
            backgroundColor: "#111",
            border: `1px solid #222`,
            borderRadius: "24px",
            padding: "35px",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
          }}>
            <h2 style={{ color: mint, marginBottom: "30px", fontSize: "1.6rem", textAlign: "center", fontWeight: "800" }}>
              {t("finish_workout")}
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#666", fontSize: "0.75rem", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                {t("workout_name")}
              </label>
              <input
                type="text"
                value={finishFormData.name}
                onChange={(e) => setFinishFormData({ ...finishFormData, name: e.target.value })}
                placeholder={t("placeholder_workout_name")}
                style={{
                  width: "100%",
                  padding: "14px",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#666", fontSize: "0.75rem", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                {t("comments")}
              </label>
              <textarea
                value={finishFormData.comments}
                onChange={(e) => setFinishFormData({ ...finishFormData, comments: e.target.value })}
                placeholder={t("placeholder_comments")}
                style={{
                  width: "100%",
                  padding: "14px",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "1rem",
                  minHeight: "100px",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  resize: "none",
                  outline: "none"
                }}
              />
            </div>

            <div style={{
              backgroundColor: "#1a1a1a",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "30px",
              border: "1px solid #333"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#666", fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "5px" }}>Ejercicios</div>
                  <div style={{ color: "#fff", fontSize: "1.4rem", fontWeight: "800" }}>{totalExercises}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#666", fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "5px" }}>Series</div>
                  <div style={{ color: "#fff", fontSize: "1.4rem", fontWeight: "800" }}>{totalSeries}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#666", fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "5px" }}>Volumen</div>
                  <div style={{ color: mint, fontSize: "1.4rem", fontWeight: "800" }}>{totalWeight.toFixed(0)} <span style={{ fontSize: "0.8rem" }}>kg</span></div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#666", fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "5px" }}>Tiempo</div>
                  <div style={{ color: "#fff", fontSize: "1.4rem", fontWeight: "800" }}>{Math.floor(elapsedTime / 60)} <span style={{ fontSize: "0.8rem" }}>min</span></div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowFinishForm(false)}
                disabled={savingWorkout}
                style={{
                  flex: 1,
                  padding: "16px",
                  backgroundColor: "transparent",
                  color: "#666",
                  border: "1px solid #333",
                  borderRadius: "14px",
                  cursor: savingWorkout ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  transition: "all 0.3s ease"
                }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveFinishedRoutine}
                disabled={savingWorkout}
                style={{
                  flex: 2,
                  padding: "16px",
                  backgroundColor: mint,
                  color: "#000",
                  border: "none",
                  borderRadius: "14px",
                  cursor: savingWorkout ? "not-allowed" : "pointer",
                  fontWeight: "800",
                  transition: "all 0.3s ease",
                  boxShadow: `0 10px 20px rgba(46, 230, 197, 0.2)`
                }}
              >
                {savingWorkout ? "Guardando..." : "GUARDAR ENTRENAMIENTO"}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (workoutState === "ongoing") {
    // Calcular estadísticas en tiempo real
    const totalCompletedSeries = Object.keys(seriesCompleted).filter(key => seriesCompleted[key]).length;
    const totalVolume = Object.keys(seriesCompleted).reduce((sum, key) => {
      if (!seriesCompleted[key]) return sum;
      const weight = parseFloat(currentWeight[key]) || 0;
      const reps = parseInt(currentReps[key]) || 0;
      return sum + (weight * reps);
    }, 0);

    return (
      <Layout>
        <div style={{ 
          padding: 0, 
          maxWidth: "900px", 
          margin: "0 auto", 
          backgroundColor: "#000", 
          minHeight: "100vh",
          color: "#fff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}>
          {/* Header Superior Estilo Captura */}
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
            <div 
              onClick={() => isReadOnly ? router.push('/profile') : setShowDiscardConfirm(true)}
              style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
            >
              <span style={{ fontSize: "1.2rem", color: "#fff" }}>{isReadOnly ? "←" : "∨"}</span>
              <span style={{ fontSize: "1.1rem", fontWeight: "500", color: "#fff" }}>
                {isReadOnly ? "Resumen" : isEditingOldWorkout ? "Editando Entreno" : "Entreno"}
              </span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {!isReadOnly && isEditingOldWorkout && (
                <button
                  onClick={() => setShowDiscardConfirm(true)}
                  style={{
                    backgroundColor: "transparent",
                    color: "#ff4d4d",
                    border: "1px solid #ff4d4d",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => isReadOnly ? router.push('/profile') : handleCompleteWorkout()}
                style={{
                  backgroundColor: mint,
                  color: "#000",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                {isReadOnly ? "Cerrar" : isEditingOldWorkout ? "Guardar" : "Terminar"}
              </button>
            </div>
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
                <h3 style={{ color: "#fff", margin: "0 0 15px 0" }}>
                  {isEditingOldWorkout ? "¿Cancelar edición?" : "¿Cancelar entrenamiento?"}
                </h3>
                <p style={{ color: "#aaa", fontSize: "0.95rem", marginBottom: "25px" }}>
                  {isEditingOldWorkout 
                    ? "Se descartarán los cambios y el entrenamiento volverá a su estado original." 
                    : "Se perderán todos los datos registrados en esta sesión."}
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={() => setShowDiscardConfirm(false)} 
                    style={{ flex: 1, padding: "12px", backgroundColor: "#333", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    Continuar
                  </button>
                  <button 
                    onClick={handleDiscardWorkout} 
                    style={{ flex: 1, padding: "12px", backgroundColor: "#ff4d4d", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    {isEditingOldWorkout ? "Descartar" : "Salir"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fila de Estadísticas Estilo Dashboard */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
            padding: "10px 15px 20px 15px",
            backgroundColor: "#000",
            position: "sticky",
            top: "60px",
            zIndex: 1001,
            borderBottom: "1px solid #1a1a1a"
          }}>
            <div style={{ backgroundColor: "#111", padding: "12px", borderRadius: "12px", textAlign: "center", border: "1px solid #222" }}>
              <div style={{ color: "#666", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Tiempo</div>
              <div style={{ color: mint, fontSize: "1rem", fontWeight: "700" }}>{formatElapsedTime(elapsedTime)}</div>
            </div>
            <div style={{ backgroundColor: "#111", padding: "12px", borderRadius: "12px", textAlign: "center", border: "1px solid #222" }}>
              <div style={{ color: "#666", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Volumen</div>
              <div style={{ color: "#fff", fontSize: "1rem", fontWeight: "700" }}>{totalVolume.toLocaleString()} <span style={{ fontSize: "0.7rem" }}>kg</span></div>
            </div>
            <div style={{ backgroundColor: "#111", padding: "12px", borderRadius: "12px", textAlign: "center", border: "1px solid #222" }}>
              <div style={{ color: "#666", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Series</div>
              <div style={{ color: "#fff", fontSize: "1rem", fontWeight: "700" }}>{totalCompletedSeries}</div>
            </div>
          </div>

          <div style={{ padding: "15px" }}>
            {routine.exercises.map((exercise, exIdx) => (
              <div
                key={exIdx}
                style={{
                  backgroundColor: "#111",
                  borderRadius: "20px",
                  padding: "20px",
                  marginBottom: "25px",
                  border: "1px solid #222"
                }}
              >
                {/* Título del Ejercicio con Imagen */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "14px",
                      backgroundColor: "#1a1a1a",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                      border: "1px solid #333"
                    }}>
                      <img 
                        src={`/exercises/${exercise.name.toLowerCase().replace(/ /g, "_")}.png`} 
                        onError={(e) => { e.target.src = "/logo3.png"; }}
                        alt="" 
                        style={{ width: "70%", height: "auto" }} 
                      />
                    </div>
                    <div>
                      <h2 
                        onClick={() => setShowHistoryModal(exercise.name)}
                        style={{ 
                          margin: 0, 
                          color: mint, 
                          fontSize: "1.1rem", 
                          fontWeight: "700",
                          lineHeight: "1.2",
                          cursor: "pointer"
                        }}
                      >
                        {t(exercise.name)}
                      </h2>
                      <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "2px" }}>{exercise.group || "Ejercicio"}</div>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div style={{ position: "relative" }}>
                      <button 
                        onClick={() => setActiveExerciseMenu(activeExerciseMenu === exIdx ? null : exIdx)}
                        style={{ background: "#1a1a1a", border: "none", color: "#666", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}
                      >
                        ⋮
                      </button>
                      
                      {activeExerciseMenu === exIdx && (
                        <div style={{
                          position: "absolute",
                          top: "40px",
                          right: 0,
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: "12px",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                          zIndex: 100,
                          width: "180px",
                          overflow: "hidden"
                        }}>
                          <button
                            onClick={() => {
                              setSubstitutingExerciseIdx(exIdx);
                              setExercisesData(exercisesList);
                              setShowAddExerciseModal(true);
                              setActiveExerciseMenu(null);
                            }}
                            style={{
                              width: "100%",
                              padding: "14px",
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
                              padding: "14px",
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
                  )}
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
                      textAlign: "center"
                    }}>
                      <h3 style={{ color: "#fff", margin: "0 0 15px 0" }}>¿Eliminar ejercicio?</h3>
                      <p style={{ color: "#aaa", fontSize: "0.9rem", marginBottom: "20px" }}>
                        Esta acción no se puede deshacer.
                      </p>
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
                            handleDeleteExercise(exIdx);
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

                {/* Notas Rediseñadas */}
                <div style={{ marginBottom: "15px" }}>
                  <input 
                    type="text" 
                    placeholder={isReadOnly ? "" : "Escribe una nota para este ejercicio..."} 
                    readOnly={isReadOnly}
                    style={{ 
                      width: "100%", 
                      background: "rgba(255,255,255,0.03)", 
                      border: "none", 
                      color: "#888", 
                      fontSize: "0.85rem",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      outline: "none",
                      fontStyle: "italic"
                    }} 
                  />
                </div>

                {/* Temporizador de Descanso Estilo Dashboard */}
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  color: mint, 
                  marginBottom: "20px",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: mint }}></div>
                  <span 
                    onClick={() => {
                      if (isReadOnly) return;
                      setOpenTimePickerId(openTimePickerId === exIdx ? null : exIdx);
                      // Pre-fill tempRestTime with current value
                      setTempRestTime(exercise.rest.toString());
                    }}
                    style={{ cursor: isReadOnly ? "default" : "pointer" }}
                  >
                    Descanso: {exercise.rest < 60 ? `${exercise.rest}s` : `${Math.floor(exercise.rest/60)}m ${exercise.rest%60}s`}
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
                          height: "150px", 
                          overflowY: "scroll", 
                          position: "relative",
                          scrollbarWidth: "none",
                          msOverflowStyle: "none",
                          padding: "60px 0"
                        }}>
                          {baseTimeOptions.map((opt) => (
                            <div 
                              key={opt.value}
                              onClick={() => {
                                handleUpdateRestTime(exIdx, opt.value);
                                setOpenTimePickerId(null);
                              }}
                              style={{
                                padding: "12px 0",
                                color: exercise.rest === opt.value ? "#000" : "#666",
                                backgroundColor: exercise.rest === opt.value ? mint : "transparent",
                                borderRadius: "8px",
                                fontSize: exercise.rest === opt.value ? "1.4rem" : "1.1rem",
                                fontWeight: exercise.rest === opt.value ? "bold" : "normal",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                margin: "2px 0"
                              }}
                            >
                              {opt.label}
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                          <button 
                            onClick={() => setOpenTimePickerId(null)}
                            style={{
                              flex: 1,
                              padding: "12px",
                              backgroundColor: "#333",
                              color: "#fff",
                              border: "none",
                              borderRadius: "10px",
                              fontWeight: "bold",
                              cursor: "pointer"
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tabla de Series Rediseñada */}
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "50px 1fr 75px 75px 50px", 
                    gap: "10px", 
                    marginBottom: "12px",
                    color: "#444",
                    fontSize: "0.7rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                  }}>
                    <div style={{ textAlign: "center" }}>SERIE</div>
                    <div>ANTERIOR</div>
                    <div style={{ textAlign: "center" }}>KG</div>
                    <div style={{ textAlign: "center" }}>REPS</div>
                    <div style={{ textAlign: "right" }}></div>
                  </div>

                  {exercise.series.map((serie, serieIdx) => {
                    const key = `${exIdx}-${serieIdx}`;
                    const isCompleted = seriesCompleted[key];
                    const type = seriesTypes[key] || "N";
                    const prev = previousData[exercise.name];
                    
                    // Calcular el número de serie efectiva (N)
                    let effectiveIndex = 0;
                    for (let i = 0; i < serieIdx; i++) {
                      if (seriesTypes[`${exIdx}-${i}`] === "N") effectiveIndex++;
                    }

                    return (
                      <div
                        key={serieIdx}
                        style={{
                          display: "grid", 
                          gridTemplateColumns: "50px 1fr 75px 75px 50px", 
                          gap: "10px",
                          alignItems: "center",
                          marginBottom: "8px",
                          backgroundColor: isCompleted ? "rgba(46, 230, 197, 0.03)" : "transparent",
                          borderRadius: "8px",
                          transition: "all 0.3s ease"
                        }}
                      >
                        <div 
                          onClick={() => {
                            if (isReadOnly) return;
                            setShowTypeSelector({ exIdx, serieIdx });
                          }}
                          style={{ 
                            color: isCompleted ? mint : type === "N" ? "#fff" : mint, 
                            fontWeight: "800",
                            fontSize: "0.9rem",
                            cursor: isReadOnly ? "default" : "pointer",
                            backgroundColor: isCompleted ? "rgba(46, 230, 197, 0.1)" : "#1a1a1a",
                            borderRadius: "10px",
                            textAlign: "center",
                            height: "38px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: isCompleted ? `1px solid ${mintSoft}` : "1px solid #333"
                          }}
                        >
                          {type === "W" ? "W" : type === "D" ? "D" : effectiveIndex + 1}
                        </div>
                        
                        <div style={{ color: "#444", fontSize: "0.85rem", fontWeight: "500" }}>
                          {prev && prev[serieIdx] ? `${prev[serieIdx].weight}kg x ${prev[serieIdx].reps}` : "—"}
                        </div>
                        
                        <div>
                          <input
                            type="number"
                            value={currentWeight[key] || ""}
                            onChange={(e) => !isReadOnly && handleUpdateWeight(exIdx, serieIdx, e.target.value)}
                            readOnly={isReadOnly}
                            placeholder="0"
                            style={{
                              width: "100%",
                              background: "#1a1a1a",
                              border: isCompleted ? `1px solid ${mintSoft}` : "1px solid #333",
                              borderRadius: "10px",
                              color: isCompleted ? mint : "#fff",
                              textAlign: "center",
                              height: "38px",
                              fontSize: "1rem",
                              fontWeight: "600",
                              transition: "all 0.2s"
                            }}
                          />
                        </div>

                        <div>
                          <input
                            type="number"
                            value={currentReps[key] || ""}
                            onChange={(e) => !isReadOnly && handleUpdateReps(exIdx, serieIdx, e.target.value)}
                            readOnly={isReadOnly}
                            placeholder="0"
                            style={{
                              width: "100%",
                              background: "#1a1a1a",
                              border: isCompleted ? `1px solid ${mintSoft}` : "1px solid #333",
                              borderRadius: "10px",
                              color: isCompleted ? mint : "#fff",
                              textAlign: "center",
                              height: "38px",
                              fontSize: "1rem",
                              fontWeight: "600",
                              transition: "all 0.2s"
                            }}
                          />
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <button
                            onClick={() => {
                              if (isReadOnly) return;
                              const newSeriesCompleted = { ...seriesCompleted };
                              const isNowCompleted = !newSeriesCompleted[key];
                              newSeriesCompleted[key] = isNowCompleted;
                              setSeriesCompleted(newSeriesCompleted);
                              if (isNowCompleted && exercise.rest) startRestTimer(exercise.rest);
                              else stopRestTimer();
                            }}
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "10px",
                              backgroundColor: isCompleted ? mint : "#1a1a1a",
                              color: isCompleted ? "#000" : "#333",
                              border: isCompleted ? "none" : "1px solid #333",
                              cursor: isReadOnly ? "default" : "pointer",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              fontSize: "1.1rem",
                              fontWeight: "bold",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                          >
                            ✓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón Agregar Serie Rediseñado */}
                {!isReadOnly && (
                  <button
                    onClick={() => handleAddSeries(exIdx)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      backgroundColor: "rgba(46, 230, 197, 0.05)",
                      color: mint,
                      border: `1px dashed ${mintSoft}`,
                      borderRadius: "12px",
                      fontSize: "0.85rem",
                      fontWeight: "800",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.2s",
                      marginTop: "10px",
                      letterSpacing: "1px"
                    }}
                  >
                    + AGREGAR SERIE
                  </button>
                )}
              </div>
            ))}

            {/* Selector de Tipo de Serie */}
            {showTypeSelector && (
              <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.8)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 2100
              }}>
                <div style={{
                  backgroundColor: "#1a1a1a",
                  borderRadius: "12px",
                  padding: "20px",
                  width: "250px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
                }}>
                  <h3 style={{ margin: "0 0 15px 0", color: "#fff", textAlign: "center", fontSize: "1rem" }}>Tipo de Serie</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[
                      { label: "Calentamiento (W)", value: "W" },
                      { label: "Serie Efectiva", value: "N" },
                      { label: "Drop Set (D)", value: "D" }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const key = `${showTypeSelector.exIdx}-${showTypeSelector.serieIdx}`;
                          setSeriesTypes({ ...seriesTypes, [key]: opt.value });
                          setShowTypeSelector(null);
                        }}
                        style={{
                          padding: "12px",
                          backgroundColor: "#333",
                          color: opt.value === "N" ? "#fff" : mint,
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => {
                        handleDeleteSeries(showTypeSelector.exIdx, showTypeSelector.serieIdx);
                        setShowTypeSelector(null);
                      }}
                      style={{
                        padding: "12px",
                        backgroundColor: "#333",
                        color: "#ff4d4d",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      Eliminar Serie <span style={{ color: mint }}>×</span>
                    </button>

                    <button
                      onClick={() => setShowTypeSelector(null)}
                      style={{
                        padding: "10px",
                        backgroundColor: "transparent",
                        color: "#666",
                        border: "none",
                        marginTop: "10px",
                        cursor: "pointer"
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}


            {!isReadOnly && (
              <button
                onClick={handleAddExercise}
                style={{
                  width: "100%",
                  padding: "18px",
                  backgroundColor: "#111",
                  color: mint,
                  border: `1px solid ${mint}`,
                  borderRadius: "16px",
                  fontSize: "1rem",
                  fontWeight: "900",
                  cursor: "pointer",
                  marginBottom: "40px",
                  boxShadow: `0 8px 25px rgba(46, 230, 197, 0.15)`,
                  letterSpacing: "1px",
                  transition: "all 0.3s ease",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                + AGREGAR EJERCICIO
              </button>
            )}
          </div>

          {/* Rest Timer Floating (Solo si está activo y no es el de arriba) */}
          {restTimerActive && (
            <div style={{
              position: "fixed",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: mint,
              color: "#000",
              padding: "12px 24px",
              borderRadius: "30px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "15px",
              zIndex: 2000
            }}>
              <span style={{ fontWeight: "bold" }}>Descanso: {formatRestTime(restCountdown)}</span>
              <button 
                onClick={stopRestTimer}
                style={{ background: "#000", color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer" }}
              >×</button>
            </div>
          )}

          {/* Modal para agregar ejercicio (Mantenemos la lógica existente) */}
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
                  {selectedGroup ? `${t('exercises')} - ${t(selectedGroup)}` : t('select_muscle_group')}
                </h2>

                {!selectedGroup ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    {Object.keys(exercisesData).map((group) => (
                      <button
                        key={group}
                        onClick={() => setSelectedGroup(group)}
                        style={{
                          padding: "15px",
                          backgroundColor: isDark ? "#2a2a2a" : "#f1f1f1",
                          color: isDark ? mint : "#333",
                          border: `1px solid ${isDark ? "#333" : "#ddd"}`,
                          borderRadius: "12px",
                          cursor: "pointer",
                          fontSize: "0.95rem",
                          fontWeight: "600",
                          transition: "all 0.3s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "10px"
                        }}
                      >
                        <div style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          backgroundColor: "#fff",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden"
                        }}>
                          <img 
                            src={`/muscle_groups/${group.toLowerCase().replace(/ /g, "_")}.png`} 
                            onError={(e) => { e.target.src = "/logo3.png"; }}
                            alt="" 
                            style={{ width: "80%", height: "auto" }} 
                          />
                        </div>
                        {t(group) || group}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <input 
                      type="text"
                      placeholder="Buscar ejercicio..."
                      value={exerciseSearchQuery}
                      onChange={(e) => setExerciseSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                        border: `1px solid ${isDark ? "#333" : "#ddd"}`,
                        borderRadius: "8px",
                        color: isDark ? "#fff" : "#333",
                        marginBottom: "15px",
                        fontSize: "1rem",
                        boxSizing: "border-box"
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "15px" }}>
                      {exercisesData[selectedGroup]
                        ?.filter(ex => t(ex.name).toLowerCase().includes(exerciseSearchQuery.toLowerCase()))
                        .map((exercise, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            handleSelectExercise(exercise);
                            setExerciseSearchQuery("");
                          }}
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
                          {t(exercise.name)}
                        </button>
                      ))}
                      {exercisesData[selectedGroup]?.filter(ex => t(ex.name).toLowerCase().includes(exerciseSearchQuery.toLowerCase())).length === 0 && (
                        <p style={{ textAlign: "center", color: "#666", padding: "10px" }}>No se encontraron ejercicios</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedGroup(null);
                        setExerciseSearchQuery("");
                      }}
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
                      {t('back')}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowAddExerciseModal(false);
                    setSelectedGroup(null);
                    setExerciseSearchQuery("");
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
                  {t('close')}
                </button>
              </div>
            </div>
          )}

          {showHistoryModal && (() => {
            const history = getExerciseHistory(showHistoryModal);
            
            // Dimensiones del gráfico SVG
            const w = isMobile ? 280 : 350;
            const h = 180;
            const p = 30;

            let content;
            if (history.length < 2) {
              content = (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#aaa" }}>
                  <p>No hay datos suficientes para generar un gráfico.</p>
                  <p style={{ fontSize: "0.8rem", marginTop: "10px" }}>Se necesitan al menos 2 sesiones en los últimos 30 días.</p>
                </div>
              );
            } else {
              const weights = history.map(d => d.weight);
              const minW = Math.min(...weights) * 0.9;
              const maxW = Math.max(...weights) * 1.1;
              const rangeW = maxW - minW || 1;
              
              const getX = (i) => p + (i * (w - 2 * p) / (history.length - 1));
              const getY = (weight) => h - p - ((weight - minW) * (h - 2 * p) / rangeW);
              
              const points = history.map((d, i) => `${getX(i)},${getY(d.weight)}`).join(" ");
              
              content = (
                <div style={{ position: "relative", marginTop: "10px", padding: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#666", fontSize: "0.7rem", padding: `0 ${p}px` }}>
                    <span>{minW.toFixed(1)}kg</span>
                    <span>{maxW.toFixed(1)}kg</span>
                  </div>
                  <svg width={w} height={h} style={{ overflow: "visible", display: "block", margin: "0 auto" }}>
                    {/* Ejes */}
                    <line x1={p} y1={p} x2={p} y2={h - p} stroke="#333" strokeWidth="1" />
                    <line x1={p} y1={h - p} x2={w - p} y2={h - p} stroke="#333" strokeWidth="1" />
                    
                    {/* La línea del gráfico */}
                    <polyline
                      fill="none"
                      stroke={mint}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                      style={{ filter: "drop-shadow(0 0 4px rgba(46, 230, 197, 0.3))" }}
                    />
                    
                    {/* Puntos interactivos */}
                    {history.map((d, i) => (
                      <g key={i} onClick={(e) => { e.stopPropagation(); setSelectedGraphPoint(i); }} style={{ cursor: "pointer" }}>
                        <circle
                          cx={getX(i)}
                          cy={getY(d.weight)}
                          r={selectedGraphPoint === i ? 7 : 5}
                          fill={selectedGraphPoint === i ? "#fff" : mint}
                          stroke={mint}
                          strokeWidth="2"
                        />
                      </g>
                    ))}
                  </svg>
                  
                  {selectedGraphPoint !== null && (
                    <div style={{
                      position: "absolute",
                      top: getY(history[selectedGraphPoint].weight) - 55,
                      left: Math.max(0, Math.min(w - 80, getX(selectedGraphPoint) - 40)),
                      backgroundColor: "#222",
                      color: "#fff",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      textAlign: "center",
                      zIndex: 10,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                      border: `1px solid ${mint}`,
                      pointerEvents: "none"
                    }}>
                      <div style={{ fontWeight: "bold", color: mint }}>{history[selectedGraphPoint].weight} kg</div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>{history[selectedGraphPoint].formattedDate}</div>
                    </div>
                  )}
                  
                  <p style={{ textAlign: "center", color: "#666", fontSize: "0.8rem", marginTop: "15px" }}>
                    Pulsa en los puntos para ver detalles
                  </p>
                </div>
              );
            }

            return (
              <div style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(0,0,0,0.85)", display: "flex",
                justifyContent: "center", alignItems: "center", zIndex: 3000
              }} onClick={() => { setShowHistoryModal(null); setSelectedGraphPoint(null); }}>
                <div style={{
                  backgroundColor: "#1a1a1a", borderRadius: "15px", padding: "20px", 
                  width: isMobile ? "90%" : "400px", border: `1px solid #333`
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                    <h3 style={{ color: mint, margin: 0, fontSize: "1.2rem" }}>Historial: {t(showHistoryModal)}</h3>
                    <button 
                      onClick={() => { setShowHistoryModal(null); setSelectedGraphPoint(null); }}
                      style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer", lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                  
                  {content}
                  
                  <button 
                    onClick={() => { setShowHistoryModal(null); setSelectedGraphPoint(null); }}
                    style={{
                      width: "100%", padding: "12px", backgroundColor: "#333", color: "#fff",
                      border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", marginTop: "10px"
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            );
          })()}
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
                  {t('workout_completed')}
                </h2>
                    <p style={{ fontSize: "1rem", color: "#aaa", margin: "0 0 8px 0" }}>
                      <strong>{routine.name}</strong>
                    </p>
                    <p style={{ color: "#999", fontSize: "0.9rem", margin: "0" }}>
                      {routine.exercises.length} {t('exercises_count')} · {routine.exercises.reduce((sum, ex) => sum + ex.series.length, 0)} {t('series_completed_label')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setWorkoutState("preview");
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#1dd1a1",
                      color: "#000",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600",
                      transition: "all 0.3s ease",
                      whiteSpace: "nowrap"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = "#19b088";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = "#1dd1a1";
                    }}
                  >
                    {t('edit')}
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
                  ← {t("back_to_routines")}
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
                ← {t("back_to_summary")}
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
                      {t(exercise.name)}
                    </h3>
                    <p style={{ color: "#aaa", fontSize: "0.9rem", marginBottom: "12px" }}>
                      {t("rest_between_series")} {(() => {
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
                            {t("series_label")} {sIdx + 1}: {currentReps[key] || serie.reps} {exercise.type === 'time' ? 's' : t("reps_label")}
                            {(exercise.type === 'weight_reps' || !exercise.type) && ` - ${currentWeight[key] || serie.weight}kg`}
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
                    {t("workout_completed_success")}
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
                  {t("back_to_routines")}
                </button>
              </Link>
            </>
          )}
        </div>
      </Layout>
    );
  }
}
