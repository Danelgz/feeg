import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import RoutineForm from "../components/RoutineForm";
import { useUser } from "../context/UserContext";

export default function Routines() {
  const [routines, setRoutines] = useState([]);
  const [completedWorkouts, setCompletedWorkouts] = useState([]);
  const [activeTab, setActiveTab] = useState("active"); // active, completed
  const router = useRouter();
  const { theme } = useUser();
  const isDark = theme === 'dark';

  const formatElapsedTime = (seconds) => {
    if (!seconds && seconds !== 0) return null;
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

  // Función para cargar entrenamientos completados
  const loadCompletedWorkouts = () => {
    const saved = localStorage.getItem('completedWorkouts');
    if (saved) {
      setCompletedWorkouts(JSON.parse(saved));
    }
  };

  useEffect(() => {
    // Cargar rutinas completadas al montar el componente
    loadCompletedWorkouts();
    
    // Si hay un parámetro tab en la URL, usarlo para establecer la pestaña activa
    if (router.query.tab) {
      setActiveTab(router.query.tab);
    }
  }, [router.query.tab]);

  // Cargar entrenamientos completados cada vez que la ruta cambia (ej: al volver de [id].js)
  useEffect(() => {
    const handleRouteChange = () => {
      loadCompletedWorkouts();
    };

    router.events?.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events?.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  const saveRoutine = (routine) => {
    setRoutines([...routines, { ...routine, id: Date.now() }]);
  };

  const deleteRoutine = (id) => {
    setRoutines(routines.filter(r => r.id !== id));
  };

  const deleteCompletedWorkout = (id) => {
    const updated = completedWorkouts.filter(w => w.id !== id);
    setCompletedWorkouts(updated);
    localStorage.setItem('completedWorkouts', JSON.stringify(updated));
  };

  return (
    <Layout>
      <h1 style={{ fontSize: "2rem", marginBottom: "20px", color: isDark ? "#fff" : "#333" }}>Rutinas</h1>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "10px",
        marginBottom: "25px",
        borderBottom: `1px solid ${isDark ? "#333" : "#e0e0e0"}`,
        paddingBottom: "10px"
      }}>
        <button
          onClick={() => setActiveTab("active")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "active" ? "#1dd1a1" : "transparent",
            color: activeTab === "active" ? "#000" : (isDark ? "#ccc" : "#666"),
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.3s ease"
          }}
        >
          Rutinas Activas
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "completed" ? "#1dd1a1" : "transparent",
            color: activeTab === "completed" ? "#000" : (isDark ? "#ccc" : "#666"),
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.3s ease"
          }}
        >
          Entrenamientos Completados ({completedWorkouts.length})
        </button>
      </div>

      {/* Tab: Rutinas Activas */}
      {activeTab === "active" && (
        <>
          <RoutineForm saveRoutine={saveRoutine} />

          {routines.length === 0 && <p style={{ color: isDark ? "#ccc" : "#666" }}>No hay rutinas guardadas.</p>}
          {routines.map(r => (
            <div key={r.id} style={{
              backgroundColor: isDark ? "#1a1a1a" : "#fff",
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "15px",
              boxShadow: isDark ? "0 2px 6px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.05)",
              border: isDark ? "1px solid #333" : "1px solid #e0e0e0"
            }}>
              <h3 style={{ color: isDark ? "#fff" : "#333" }}>{r.name}</h3>
              <p style={{ color: isDark ? "#ccc" : "#666" }}>Días: {r.days}</p>
              <h4 style={{ color: isDark ? "#fff" : "#333" }}>Ejercicios:</h4>
              {r.exercises.length === 0 ? <p style={{ color: isDark ? "#ccc" : "#666" }}>No hay ejercicios</p> :
                r.exercises.map((ex, i) => (
                  <p key={i} style={{ color: isDark ? "#ccc" : "#666" }}>{ex.name} — Series: {ex.series} | Reps: {ex.reps} | Peso: {ex.weight}</p>
                ))
              }
              <button
                onClick={() => deleteRoutine(r.id)}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#991b1b"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#dc2626"}
              >
                Eliminar rutina
              </button>
            </div>
          ))}
        </>
      )}

      {/* Tab: Entrenamientos Completados */}
      {activeTab === "completed" && (
        <>
          {completedWorkouts.length === 0 ? (
            <p style={{ color: isDark ? "#ccc" : "#666", textAlign: "center", padding: "40px 20px" }}>
              Aún no hay entrenamientos completados. ¡Empieza a entrenar!
            </p>
          ) : (
            <div>
              {completedWorkouts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).map(workout => (
                <div key={workout.id} style={{
                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                  border: isDark ? "1px solid #333" : "1px solid #e0e0e0",
                  borderRadius: "10px",
                  padding: "20px",
                  marginBottom: "15px",
                  transition: "all 0.3s ease",
                  boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#1dd1a1";
                  e.currentTarget.style.boxShadow = isDark ? "0 4px 12px rgba(29, 209, 161, 0.1)" : "0 4px 12px rgba(29, 209, 161, 0.05)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = isDark ? "#333" : "#e0e0e0";
                  e.currentTarget.style.boxShadow = isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)";
                }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "15px" }}>
                    <div>
                      <h3 style={{ color: "#1dd1a1", margin: "0 0 8px 0" }}>{workout.name}</h3>
                      <p style={{ color: isDark ? "#999" : "#666", fontSize: "0.85rem", margin: "0" }}>
                        {new Date(workout.completedAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteCompletedWorkout(workout.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#e74c3c",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        transition: "all 0.3s ease"
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = "#c0392b"}
                      onMouseOut={(e) => e.target.style.backgroundColor = "#e74c3c"}
                    >
                      Eliminar
                    </button>
                  </div>

                  {workout.comments && (
                    <p style={{ color: isDark ? "#aaa" : "#555", marginBottom: "15px", fontStyle: "italic" }}>
                      "{workout.comments}"
                    </p>
                  )}

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: "10px",
                    marginBottom: "15px"
                  }}>
                    <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5", padding: "12px", borderRadius: "6px" }}>
                      <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 5px 0", fontSize: "0.8rem" }}>Ejercicios</p>
                      <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.3rem", fontWeight: "bold" }}>
                        {workout.exercises}
                      </p>
                    </div>
                    <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5", padding: "12px", borderRadius: "6px" }}>
                      <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 5px 0", fontSize: "0.8rem" }}>Series</p>
                      <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.3rem", fontWeight: "bold" }}>
                        {workout.series}
                      </p>
                    </div>
                    <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5", padding: "12px", borderRadius: "6px" }}>
                      <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 5px 0", fontSize: "0.8rem" }}>Reps</p>
                      <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.3rem", fontWeight: "bold" }}>
                        {workout.totalReps}
                      </p>
                    </div>
                    <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5", padding: "12px", borderRadius: "6px" }}>
                      <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 5px 0", fontSize: "0.8rem" }}>Volumen (kg)</p>
                      <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.3rem", fontWeight: "bold" }}>
                        {workout.totalVolume.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {workout.elapsedTime !== undefined ? (
                    <p style={{ color: isDark ? "#aaa" : "#666", fontSize: "0.9rem", margin: "0" }}>
                      Tiempo: {formatElapsedTime(workout.elapsedTime)}
                    </p>
                  ) : workout.totalTime > 0 && (
                    <p style={{ color: isDark ? "#aaa" : "#666", fontSize: "0.9rem", margin: "0" }}>
                      Tiempo: {workout.totalTime} minutos
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
