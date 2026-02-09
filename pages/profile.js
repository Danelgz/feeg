import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import RegisterForm from "../components/RegisterForm";
import { useUser } from "../context/UserContext";

export default function Profile() {
  const router = useRouter();
  const { 
    user, 
    authUser, 
    saveUser, 
    isLoaded, 
    isSyncing, 
    theme, 
    isMobile, 
    t, 
    loginWithGoogle, 
    logout,
    completedWorkouts,
    deleteCompletedWorkout
  } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [chartFilter, setChartFilter] = useState("3_months");
  const [chartMode, setChartMode] = useState("duration"); // duration, volume, reps
  const [activeBar, setActiveBar] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [editData, setEditData] = useState({
    username: user?.username || "",
    firstName: user?.firstName || "",
    description: user?.description || "Sin descripción",
    photoURL: user?.photoURL || authUser?.photoURL || ""
  });

  // Procesar datos para el gráfico
  const getChartData = () => {
    if (!completedWorkouts || completedWorkouts.length === 0) return [];

    const now = new Date();
    let startDate = new Date();
    if (chartFilter === "3_months") startDate.setMonth(now.getMonth() - 3);
    else if (chartFilter === "6_months") startDate.setMonth(now.getMonth() - 6);
    else if (chartFilter === "1_year") startDate.setFullYear(now.getFullYear() - 1);
    else startDate = new Date(0); // Siempre

    // Agrupar por semana (Lunes a Domingo)
    const weeks = {};
    
    completedWorkouts.forEach(w => {
      const date = new Date(w.completedAt);
      if (date < startDate) return;

      // Obtener el lunes de esa semana
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0,0,0,0);
      const weekKey = monday.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = { duration: 0, volume: 0, reps: 0, count: 0, date: monday };
      }
      
      weeks[weekKey].duration += (w.elapsedTime || (w.totalTime * 60) || 0) / 3600; // horas
      weeks[weekKey].volume += w.totalVolume || 0;
      weeks[weekKey].reps += w.totalReps || 0;
      weeks[weekKey].count += 1;
    });

    return Object.values(weeks).sort((a, b) => a.date - b.date);
  };

  const chartData = getChartData();
  const maxVal = Math.max(...chartData.map(d => d[chartMode]), 1);

  const handleDeleteWorkout = async (id) => {
    await deleteCompletedWorkout(id);
    setConfirmDelete(null);
  };

  const handleEditSave = async () => {
    const updatedUser = {
      ...user,
      username: editData.username,
      firstName: editData.firstName,
      description: editData.description,
      photoURL: editData.photoURL
    };
    await saveUser(updatedUser);
    setIsEditing(false);
  };

  const isDark = true; // Always dark per image

  if (!isLoaded || isSyncing) {
    return (
      <Layout>
        <div style={{ padding: isMobile ? "0" : "20px" }}>
          <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "1rem", color: isDark ? "#fff" : "#333" }}>{t("profile_title")}</h1>
          <p style={{ color: isDark ? "#ccc" : "#666" }}>{isSyncing ? "Sincronizando datos con la nube..." : t("loading")}</p>
        </div>
      </Layout>
    );
  }

  // Si no hay usuario autenticado, mostrar opciones de login/registro
  if (!authUser) {
    return (
      <Layout>
        <div style={{ padding: isMobile ? "0" : "20px", display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: 500 }}>
          <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "0.5rem", color: isDark ? "#fff" : "#333" }}>{t("profile_title")}</h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={loginWithGoogle}
              style={{
                padding: "14px 16px",
                backgroundColor: "#1dd1a1",
                color: "#000",
                border: "none",
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#19b088"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#1dd1a1"}
            >
              <img src="/logo2.png" alt="G" width={20} height={20} />
              Iniciar Sesión con Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: isDark ? '#333' : '#ddd' }} />
              <span style={{ fontSize: '0.8rem', color: isDark ? '#666' : '#999' }}>O</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: isDark ? '#333' : '#ddd' }} />
            </div>

            <button
              onClick={loginWithGoogle}
              style={{
                padding: "12px 16px",
                backgroundColor: "transparent",
                color: isDark ? "#fff" : "#333",
                border: `2px solid ${isDark ? "#333" : "#ddd"}`,
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "#1dd1a1"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = isDark ? "#333" : "#ddd"}
            >
              Registrarse con Google
            </button>
          </div>
          
          <p style={{ fontSize: '0.85rem', color: isDark ? '#888' : '#666', textAlign: 'center' }}>
            Si ya tienes una cuenta, tus datos se sincronizarán automáticamente.
          </p>
        </div>
      </Layout>
    );
  }

  // Si autenticado pero sin perfil completado, pedir datos actuales
  if (authUser && !user) {
    return (
      <Layout>
        <div style={{ padding: isMobile ? "0" : "20px" }}>
          <RegisterForm onRegister={(data) => {
            // Guardar junto a metadatos de auth
            saveUser({
              ...data,
              email: authUser.email || null,
              uid: authUser.uid,
              photoURL: authUser.photoURL || null,
            });
          }} />
        </div>
      </Layout>
    );
  }

  const formatHeight = () => {
    if (user.heightUnit === 'cm') {
      return `${user.height}cm`;
    } else {
      const feet = Math.floor(user.height);
      const inches = Math.round((user.height - feet) * 12);
      return `${feet}'${inches}"`;
    }
  };

  const formatWeight = () => {
    return `${user.weight}${user.weightUnit}`;
  };

  return (
    <Layout>
      <div style={{
        backgroundColor: "#000",
        color: "#fff",
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "Arial, sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{user?.username || "Nombre_usuario"}</h1>
          <div style={{ display: "flex", gap: "15px" }}>
            <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            </button>
            <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
          <div style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            backgroundColor: "#fff",
            color: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            fontWeight: "bold",
            overflow: "hidden"
          }}>
            {user?.photoURL ? <img src={user.photoURL} alt="Perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Perfil"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{user?.firstName || "Nombre"}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", textAlign: "center" }}>
              <div>
                <div style={{ color: "#aaa", fontSize: "0.8rem" }}>Entrenos</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{completedWorkouts?.length || 0}</div>
              </div>
              <div>
                <div style={{ color: "#aaa", fontSize: "0.8rem" }}>Seguidores</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>8</div>
              </div>
              <div>
                <div style={{ color: "#aaa", fontSize: "0.8rem" }}>Siguiendo</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>13</div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: "30px", fontSize: "0.95rem" }}>
          {user?.description || "DESCRIPCIÓN DEL USUARIO"}
        </div>

        {/* Graph Section */}
        <div style={{ marginBottom: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Gráfico horas por semana</h2>
            <select 
              value={chartFilter}
              onChange={(e) => setChartFilter(e.target.value)}
              style={{ background: "none", border: "none", color: "#1dd1a1", fontSize: "0.9rem", cursor: "pointer", outline: "none" }}
            >
              <option value="3_months" style={{ backgroundColor: "#1a1a1a" }}>Últimos 3 meses</option>
              <option value="6_months" style={{ backgroundColor: "#1a1a1a" }}>Últimos 6 meses</option>
              <option value="1_year" style={{ backgroundColor: "#1a1a1a" }}>Último año</option>
              <option value="always" style={{ backgroundColor: "#1a1a1a" }}>Siempre</option>
            </select>
          </div>
          
          <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "10px", position: "relative" }}>
            {chartData.length === 0 ? (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>Sin datos suficientes</div>
            ) : (
              chartData.map((d, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveBar(activeBar === i ? null : i)}
                  style={{ 
                    flex: 1, 
                    backgroundColor: activeBar === i ? "#fff" : "#1dd1a1", 
                    height: `${(d[chartMode] / maxVal) * 100}%`, 
                    borderRadius: "2px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative"
                  }} 
                >
                  {activeBar === i && (
                    <div style={{
                      position: "absolute",
                      bottom: "110%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#fff",
                      color: "#000",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      fontWeight: "bold"
                    }}>
                      {chartMode === 'duration' ? `${d.duration.toFixed(1)}h` : 
                       chartMode === 'volume' ? `${d.volume.toLocaleString()}kg` : 
                       `${d.reps.toLocaleString()} reps`}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
            {[
              { id: "duration", label: "Duración" },
              { id: "volume", label: "Volumen" },
              { id: "reps", label: "Repeticiones" }
            ].map((m) => (
              <button 
                key={m.id} 
                onClick={() => setChartMode(m.id)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "20px",
                  border: "none",
                  backgroundColor: chartMode === m.id ? "#1dd1a1" : "#1a1a1a",
                  color: chartMode === m.id ? "#000" : "#fff",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >{m.label}</button>
            ))}
          </div>
        </div>

        {/* Information Buttons */}
        <h3 style={{ fontSize: "1rem", color: "#888", marginBottom: "15px" }}>Información</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "30px" }}>
          {[
            { label: "Estadísticas", path: "/statistics", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg> },
            { label: "Ejercicios", path: "/exercises", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18h12"></path><path d="M6 6h12"></path><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="12" r="3"></circle></svg> },
            { label: "Medidas", path: "/measures", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg> },
            { label: "Calendario", path: "/calendar", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> }
          ].map(btn => (
            <button 
              key={btn.label} 
              onClick={() => router.push(btn.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "15px",
                backgroundColor: "#1a1a1a",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: "pointer"
              }}
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
        </div>

        {/* Workouts Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3 style={{ fontSize: "1.1rem", color: "#888", margin: 0 }}>Entrenamientos</h3>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {(!completedWorkouts || completedWorkouts.length === 0) ? (
            <div style={{ color: "#444" }}>No hay entrenamientos registrados</div>
          ) : (
            [...completedWorkouts]
              .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
              .map(workout => (
                <div key={workout.id} style={{
                  backgroundColor: "#1a1a1a",
                  padding: "15px",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "1rem", color: "#1dd1a1" }}>{workout.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#888" }}>
                        {new Date(workout.completedAt).toLocaleDateString()} - {workout.totalVolume?.toLocaleString()}kg - {workout.series} series
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button 
                        onClick={() => router.push(`/routines/${workout.routineId || "empty"}`)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}
                        title="Ver entrenamiento"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </button>
                      <button 
                        onClick={() => router.push("/")} // Summary is in Home
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}
                        title="Resumen"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line></svg>
                      </button>
                      <button 
                        onClick={() => router.push(`/routines/create?edit=${workout.id}`)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}
                        title="Editar"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button 
                        onClick={() => setConfirmDelete(workout.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ff4d4d" }}
                        title="Borrar"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 3000, padding: "20px"
        }}>
          <div style={{ backgroundColor: "#1a1a1a", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center" }}>
            <h2 style={{ color: "#fff", marginBottom: "15px" }}>¿Borrar entrenamiento?</h2>
            <p style={{ color: "#888", marginBottom: "25px" }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #333", backgroundColor: "transparent", color: "#fff" }}>Cancelar</button>
              <button onClick={() => handleDeleteWorkout(confirmDelete)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#ff4d4d", color: "#fff", fontWeight: "bold" }}>Borrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 2000, padding: "20px"
        }}>
          <div style={{ backgroundColor: "#1a1a1a", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px" }}>
            <h2 style={{ color: "#fff", marginBottom: "20px" }}>Editar Perfil</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ color: "#888", fontSize: "0.8rem" }}>Usuario</label>
                <input 
                  value={editData.username} 
                  onChange={e => setEditData({...editData, username: e.target.value})}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #333", backgroundColor: "#000", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ color: "#888", fontSize: "0.8rem" }}>Nombre</label>
                <input 
                  value={editData.firstName} 
                  onChange={e => setEditData({...editData, firstName: e.target.value})}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #333", backgroundColor: "#000", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ color: "#888", fontSize: "0.8rem" }}>Descripción</label>
                <textarea 
                  value={editData.description} 
                  onChange={e => setEditData({...editData, description: e.target.value})}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #333", backgroundColor: "#000", color: "#fff", minHeight: "80px" }}
                />
              </div>
              
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #333", backgroundColor: "transparent", color: "#fff" }}>Cancelar</button>
                <button onClick={handleEditSave} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#1dd1a1", color: "#000", fontWeight: "bold" }}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
