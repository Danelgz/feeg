import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import Link from "next/link";
import { useUser } from "../context/UserContext";

export default function Home() {
  const router = useRouter();
  const { user, isLoaded, theme, t } = useUser();
  const [completedWorkouts, setCompletedWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const videoRef = useRef(null);
  
  const isDark = theme === 'dark';

  useEffect(() => {
    if (showIntro && videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log("Autoplay prevented:", error);
      });
    }
  }, [showIntro]);

  useEffect(() => {
    // Verificar si ya se mostró la intro en esta sesión
    const introShown = sessionStorage.getItem('introShown');
    if (!introShown) {
      setShowIntro(true);
    }
  }, []);

  const handleCloseIntro = () => {
    setShowIntro(false);
    sessionStorage.setItem('introShown', 'true');
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/profile");
    }
  }, [user, isLoaded, router]);

  useEffect(() => {
    // Cargar entrenamientos completados de localStorage
    const saved = localStorage.getItem('completedWorkouts');
    if (saved) {
      const workouts = JSON.parse(saved);
      // Mostrar solo los últimos 5 entrenamientos, ordenados por más reciente primero
      setCompletedWorkouts(workouts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 5));
    }
  }, []);

  // Recargar entrenamientos cuando se vuelve a la página de inicio
  useEffect(() => {
    const handleRouteChange = () => {
      const saved = localStorage.getItem('completedWorkouts');
      if (saved) {
        const workouts = JSON.parse(saved);
        setCompletedWorkouts(workouts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 5));
      }
    };

    router.events?.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events?.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  if (!isLoaded) {
    return (
      <Layout>
        <p style={{ color: isDark ? "#ccc" : "#666" }}>{t("loading")}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      {showIntro && isMobile && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#000",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}>
          <video 
            ref={videoRef}
            autoPlay 
            muted 
            playsInline 
            onEnded={handleCloseIntro}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          >
            <source src={isDark ? "/entrada2.mp4" : "/entrada.mp4"} type="video/mp4" />
            Tu navegador no soporta el elemento de video.
          </video>
        </div>
      )}
      <div style={{ padding: isMobile ? "10px" : "20px", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ color: isDark ? "#fff" : "#333", fontSize: isMobile ? "1.8rem" : "2.5rem", marginBottom: "1rem" }}>{t("welcome_title")}</h1>
        <p style={{ color: isDark ? "#ccc" : "#666", fontSize: isMobile ? "1rem" : "1.1rem", lineHeight: "1.6" }}>
          {t("welcome_subtitle")}
        </p>

        <div style={{ marginTop: "20px", marginBottom: "40px" }}>
          <Link href="/routines">
            <button
              style={{
                padding: "12px 20px",
                backgroundColor: "#1dd1a1",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                transition: "all 0.3s ease",
                width: isMobile ? "100%" : "auto"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#19b088";
                e.target.style.boxShadow = "0 4px 8px rgba(29, 209, 161, 0.3)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#1dd1a1";
                e.target.style.boxShadow = "none";
              }}
            >
              {t("go_to_routines")}
            </button>
          </Link>
        </div>

        {/* Feed de Entrenamientos Completados */}
        {completedWorkouts.length > 0 && (
          <div style={{ marginTop: "40px" }}>
            <h2 style={{ color: "#1dd1a1", fontSize: "1.8rem", marginBottom: "20px" }}>
              {t("last_workouts")}
            </h2>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "15px"
            }}>
              {completedWorkouts.map(workout => (
                <div
                  key={workout.id}
                  style={{
                    backgroundColor: isDark ? "#1a1a1a" : "#fff",
                    border: isDark ? "1px solid #333" : "1px solid #e0e0e0",
                    borderRadius: "10px",
                    padding: "20px",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    position: "relative",
                    boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)"
                  }}
                  onClick={() => setSelectedWorkout(workout)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#1dd1a1";
                    e.currentTarget.style.boxShadow = isDark ? "0 4px 12px rgba(29, 209, 161, 0.2)" : "0 4px 12px rgba(29, 209, 161, 0.1)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = isDark ? "#333" : "#e0e0e0";
                    e.currentTarget.style.boxShadow = isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <h3 style={{
                    color: "#1dd1a1",
                    margin: "0 0 8px 0",
                    fontSize: "1.2rem",
                    fontWeight: "600"
                  }}>
                    {workout.name}
                  </h3>
                  
                  <p style={{
                    color: isDark ? "#999" : "#666",
                    fontSize: "0.85rem",
                    margin: "0 0 12px 0"
                  }}>
                    {new Date(workout.completedAt).toLocaleDateString(t("lang_code"), {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>

                  {workout.comments && (
                    <p style={{
                      color: isDark ? "#aaa" : "#555",
                      fontSize: "0.9rem",
                      margin: "0 0 12px 0",
                      fontStyle: "italic",
                      borderLeft: "2px solid #1dd1a1",
                      paddingLeft: "12px",
                      maxHeight: "60px",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      "{workout.comments}"
                    </p>
                  )}

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "12px"
                  }}>
                    <div style={{
                      backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      textAlign: "center"
                    }}>
                      <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 3px 0", fontSize: "0.75rem" }}>{t("series")}</p>
                      <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.1rem", fontWeight: "bold" }}>
                        {workout.series}
                      </p>
                    </div>
                    <div style={{
                      backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      textAlign: "center"
                    }}>
                      <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 3px 0", fontSize: "0.75rem" }}>{t("volume")}</p>
                      <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.1rem", fontWeight: "bold" }}>
                        {workout.totalVolume.toLocaleString()} kg
                      </p>
                    </div>
                  </div>

                  {workout.elapsedTime !== undefined ? (
                    <p style={{
                      color: isDark ? "#aaa" : "#666",
                      fontSize: "0.85rem",
                      margin: "0",
                      textAlign: "center"
                    }}>
                      {t("time")}: {formatElapsedTime(workout.elapsedTime)}
                    </p>
                  ) : workout.totalTime > 0 && (
                    <p style={{
                      color: isDark ? "#aaa" : "#666",
                      fontSize: "0.85rem",
                      margin: "0",
                      textAlign: "center"
                    }}>
                      {t("time")}: {workout.totalTime} min
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Resumen de Entrenamiento */}
        {selectedWorkout && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px"
            }}
            onClick={() => setSelectedWorkout(null)}
          >
            <div
              style={{
                backgroundColor: isDark ? "#1a1a1a" : "#fff",
                border: "2px solid #1dd1a1",
                borderRadius: "15px",
                padding: isMobile ? "15px" : "30px",
                maxWidth: "600px",
                width: isMobile ? "95%" : "100%",
                maxHeight: "85vh",
                overflowY: "auto",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ color: "#1dd1a1", margin: "0 0 5px 0" }}>{selectedWorkout.name}</h2>
                  <p style={{ color: isDark ? "#999" : "#666", margin: 0, fontSize: "0.9rem" }}>
                    {new Date(selectedWorkout.completedAt).toLocaleDateString(t("lang_code"), {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedWorkout(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: isDark ? "#fff" : "#333",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    padding: "5px"
                  }}
                >
                  X
                </button>
              </div>

              {selectedWorkout.comments && (
                <div style={{ 
                  backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9", 
                  padding: "15px", 
                  borderRadius: "8px", 
                  marginBottom: "20px",
                  borderLeft: "4px solid #1dd1a1"
                }}>
                  <p style={{ color: isDark ? "#ccc" : "#444", margin: 0, fontStyle: "italic" }}>"{selectedWorkout.comments}"</p>
                </div>
              )}

              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(2, 1fr)", // keeping grid but making sure it fits
                gap: isMobile ? "10px" : "15px",
                marginBottom: "25px"
              }}>
                <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 5px 0", fontSize: "0.8rem" }}>{t("total_series")}</p>
                  <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.2rem", fontWeight: "bold" }}>{selectedWorkout.series}</p>
                </div>
                <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 5px 0", fontSize: "0.8rem" }}>{t("total_volume")}</p>
                  <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.2rem", fontWeight: "bold" }}>{selectedWorkout.totalVolume.toLocaleString()} kg</p>
                </div>
                <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 5px 0", fontSize: "0.8rem" }}>{t("reps")}</p>
                  <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.2rem", fontWeight: "bold" }}>{selectedWorkout.totalReps}</p>
                </div>
                <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 5px 0", fontSize: "0.8rem" }}>{t("time")}</p>
                  <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.2rem", fontWeight: "bold" }}>
                    {selectedWorkout.elapsedTime ? formatElapsedTime(selectedWorkout.elapsedTime) : `${selectedWorkout.totalTime} min`}
                  </p>
                </div>
              </div>

              <h3 style={{ color: isDark ? "#fff" : "#333", borderBottom: `1px solid ${isDark ? "#333" : "#e0e0e0"}`, paddingBottom: "10px", marginBottom: "20px" }}>{t("exercises_count")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {selectedWorkout.exerciseDetails ? selectedWorkout.exerciseDetails.map((ex, exIdx) => (
                  <div key={exIdx} style={{
                    backgroundColor: isDark ? "#1a1a1a" : "#fff",
                    border: isDark ? "1px solid #333" : "1px solid #e0e0e0",
                    borderRadius: "8px",
                    padding: "20px"
                  }}>
                    <h2 style={{ margin: "0 0 15px 0", color: "#1dd1a1" }}>
                      {exIdx + 1}. {t(ex.name)}
                    </h2>
                    
                    <h3 style={{ margin: "0 0 12px 0", color: isDark ? "#fff" : "#333", fontSize: "1.1rem" }}>{t("series")}</h3>
                    {ex.series.map((s, sIdx) => (
                      <div key={sIdx} style={{
                        backgroundColor: isDark ? "#0f0f0f" : "#f9f9f9",
                        border: "2px solid #1dd1a1",
                        borderRadius: "6px",
                        padding: "15px",
                        marginBottom: "10px",
                        opacity: 0.8
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "15px", flex: 1 }}>
                            <div style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              backgroundColor: "#1dd1a1",
                              color: "#000",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "bold",
                              fontSize: "1.2rem"
                            }}>
                              X
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div>
                                <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.8rem", marginBottom: "3px" }}>{t("reps")}</label>
                                <div style={{
                                  padding: "6px 8px",
                                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                                  border: `1px solid ${isDark ? "#333" : "#e0e0e0"}`,
                                  borderRadius: "4px",
                                  color: isDark ? "#fff" : "#333",
                                  width: "70px",
                                  fontSize: "0.95rem",
                                  textAlign: "center",
                                  fontWeight: "bold"
                                }}>
                                  {s.reps}
                                </div>
                              </div>

                              <div>
                                <label style={{ display: "block", color: isDark ? "#aaa" : "#666", fontSize: "0.8rem", marginBottom: "3px" }}>{t("weight_kg")}</label>
                                <div style={{
                                  padding: "6px 8px",
                                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                                  border: `1px solid ${isDark ? "#333" : "#e0e0e0"}`,
                                  borderRadius: "4px",
                                  color: isDark ? "#fff" : "#333",
                                  width: "70px",
                                  fontSize: "0.95rem",
                                  textAlign: "center",
                                  fontWeight: "bold"
                                }}>
                                  {s.weight}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )) : (
                  <p style={{ color: isDark ? "#aaa" : "#666" }}>{t("workout_details_not_available")}</p>
                )}
              </div>
              
              <button 
                onClick={() => setSelectedWorkout(null)}
                style={{
                  width: "100%",
                  padding: "15px",
                  marginTop: "30px",
                  backgroundColor: isDark ? "#333" : "#e0e0e0",
                  color: isDark ? "#fff" : "#333",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.target.style.opacity = "0.8"}
                onMouseOut={(e) => e.target.style.opacity = "1"}
              >
                {t("close_summary")}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
