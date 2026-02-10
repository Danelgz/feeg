import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import RegisterForm from "../components/RegisterForm";
import { useUser } from "../context/UserContext";
import { getFollowersList, getFollowingList } from "../lib/firebase";

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
    isLoggingIn,
    logout,
    completedWorkouts,
    deleteCompletedWorkout,
    followers,
    following
  } = useUser();
  const isDark = theme === 'dark';
  const [isEditing, setIsEditing] = useState(false);
  const [chartFilter, setChartFilter] = useState("3_months");
  const [chartMode, setChartMode] = useState("duration"); // duration, volume, reps
  const [activeBar, setActiveBar] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [isPhotoFullScreen, setIsPhotoFullScreen] = useState(false);

  const handleOpenFollowers = async () => {
    setShowFollowers(true);
    const list = await getFollowersList(authUser.uid);
    setFollowersList(list);
  };

  const handleOpenFollowing = async () => {
    setShowFollowing(true);
    const list = await getFollowingList(authUser.uid);
    setFollowingList(list);
  };

  const [editData, setEditData] = useState({
    username: "",
    firstName: "",
    description: "",
    photoURL: ""
  });

  useEffect(() => {
    if (user) {
      setEditData({
        username: user.username || "",
        firstName: user.firstName || "",
        description: user.description || "Sin descripción",
        photoURL: user.photoURL || authUser?.photoURL || ""
      });
    }
  }, [user, authUser]);

  // Procesar datos para el gráfico con seguridad extra
  const getChartData = () => {
    if (!completedWorkouts || !Array.isArray(completedWorkouts)) return [];

    try {
      const now = new Date();
      let startDate = new Date();
      if (chartFilter === "3_months") startDate.setMonth(now.getMonth() - 3);
      else if (chartFilter === "6_months") startDate.setMonth(now.getMonth() - 6);
      else if (chartFilter === "1_year") startDate.setFullYear(now.getFullYear() - 1);
      else startDate = new Date(0);

      // Alinear startDate al lunes de esa semana
      const startDay = startDate.getDay();
      const startDiff = startDate.getDate() - startDay + (startDay === 0 ? -6 : 1);
      startDate = new Date(new Date(startDate).setDate(startDiff));
      startDate.setHours(0,0,0,0);

      const weeks = [];
      const weeksMap = {};
      
      // Generar todas las semanas desde startDate hasta hoy
      let current = new Date(startDate);
      while (current <= now) {
        const weekKey = current.toISOString().split('T')[0];
        const weekEnd = new Date(current);
        weekEnd.setDate(current.getDate() + 6);
        
        const weekObj = { 
          duration: 0, 
          volume: 0, 
          reps: 0, 
          count: 0, 
          date: new Date(current),
          range: `${current.getDate()}-${weekEnd.getDate()}`
        };
        weeksMap[weekKey] = weekObj;
        weeks.push(weekObj);
        
        current.setDate(current.getDate() + 7);
      }
      
      completedWorkouts.forEach(w => {
        if (!w || !w.completedAt) return;
        const date = new Date(w.completedAt);
        if (isNaN(date.getTime()) || date < startDate) return;

        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(new Date(date).setDate(diff));
        monday.setHours(0,0,0,0);
        const weekKey = monday.toISOString().split('T')[0];

        if (weeksMap[weekKey]) {
          weeksMap[weekKey].duration += (Number(w.elapsedTime) || (Number(w.totalTime) * 60) || 0) / 3600;
          weeksMap[weekKey].volume += Number(w.totalVolume) || 0;
          weeksMap[weekKey].reps += Number(w.totalReps) || 0;
          weeksMap[weekKey].count += 1;
        }
      });

      return weeks;
    } catch (e) {
      console.error("Error generating chart data:", e);
      return [];
    }
  };

  const spanishMonths = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const formatRangeDate = (date) => date ? `${date.getDate()} ${spanishMonths[date.getMonth()]}` : "";

  const chartData = getChartData();
  const overallRange = chartData.length > 0 
    ? `(${formatRangeDate(chartData[0].date)}, ${formatRangeDate(new Date())})`
    : "";
  const maxVal = Math.max(chartMode === 'duration' ? 5 : 1, ...chartData.map(d => d[chartMode]), 1);

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

  const [viewingSummary, setViewingSummary] = useState(null);

  const WorkoutCard = ({ workout }) => (
    <div style={{ backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "12px", marginBottom: "15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#1dd1a1" }}>{workout.name}</div>
          <div style={{ fontSize: "0.8rem", color: "#888" }}>{new Date(workout.completedAt).toLocaleString()}</div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setViewingSummary(workout)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1dd1a1", fontSize: "0.85rem" }}>Resumen</button>
          <button onClick={() => router.push(`/routines/${workout.routineId || 'edit'}?editWorkoutId=${workout.id}`)} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "0.85rem" }}>Editar</button>
          <button onClick={() => setConfirmDelete(workout.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ff4757", fontSize: "0.85rem" }}>Borrar</button>
        </div>
      </div>
      <div style={{ fontSize: "0.9rem", color: "#ccc" }}>
        {workout.series} series • {workout.totalVolume?.toLocaleString()} kg • {workout.totalReps} reps
      </div>
    </div>
  );

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
              disabled={isLoggingIn}
              style={{
                padding: "14px 16px",
                backgroundColor: isLoggingIn ? "#19b088" : "#1dd1a1",
                color: "#000",
                border: "none",
                borderRadius: 10,
                cursor: isLoggingIn ? 'default' : 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s ease',
                opacity: isLoggingIn ? 0.7 : 1
              }}
              onMouseOver={(e) => !isLoggingIn && (e.currentTarget.style.backgroundColor = "#19b088")}
              onMouseOut={(e) => !isLoggingIn && (e.currentTarget.style.backgroundColor = "#1dd1a1")}
            >
              <img src="/logo2.png" alt="G" width={20} height={20} />
              {isLoggingIn ? "Cargando..." : "Iniciar Sesión con Google"}
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
        {/* Profile Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
          <div 
            onClick={() => setIsPhotoFullScreen(true)}
            style={{
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
              overflow: "hidden",
              cursor: "pointer",
              border: "2px solid #1dd1a1"
            }}
          >
            {user?.photoURL ? <img src={user.photoURL} alt="Perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Perfil"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{user?.firstName || "Nombre"}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", textAlign: "center" }}>
              <div style={{ cursor: "pointer" }}>
                <div style={{ color: "#aaa", fontSize: "0.8rem" }}>Entrenos</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{completedWorkouts?.length || 0}</div>
              </div>
              <div onClick={handleOpenFollowers} style={{ cursor: "pointer" }}>
                <div style={{ color: "#aaa", fontSize: "0.8rem" }}>Seguidores</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{followers?.length || 0}</div>
              </div>
              <div onClick={handleOpenFollowing} style={{ cursor: "pointer" }}>
                <div style={{ color: "#aaa", fontSize: "0.8rem" }}>Siguiendo</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{following?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>

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

        {/* Description */}
        <div style={{ marginBottom: "30px", fontSize: "0.95rem" }}>
          {user?.description || "DESCRIPCIÓN DEL USUARIO"}
        </div>

        {/* Graph Section */}
        <div style={{ marginBottom: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
              Gráfico horas por semana <span style={{ color: "#888", fontSize: "0.8rem", marginLeft: "5px" }}>{overallRange}</span>
            </h2>
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
          
          <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "10px", position: "relative", paddingTop: "20px" }}>
            {chartData.length === 0 ? (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>Sin datos suficientes</div>
            ) : (
              chartData.map((d, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveBar(activeBar === i ? null : i)}
                  style={{ 
                    flex: 1, 
                    backgroundColor: activeBar === i ? "#fff" : (d[chartMode] > 0 ? "#1dd1a1" : "#1a1a1a"), 
                    border: d[chartMode] === 0 ? "1px solid #333" : "none",
                    height: `${Math.max(5, (d[chartMode] / maxVal) * 100)}%`, 
                    borderRadius: "2px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative"
                  }} 
                >
                  {i % 2 === 0 && (
                    <div style={{
                      position: "absolute",
                      bottom: "105%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      color: "#555",
                      fontSize: "0.6rem",
                      whiteSpace: "nowrap",
                      fontWeight: "bold"
                    }}>
                      {d.range}
                    </div>
                  )}
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
                      fontWeight: "bold",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.5)"
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
          <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "4px", height: "20px", backgroundColor: "#1dd1a1", borderRadius: "2px" }}></span>
            Entrenamientos
          </h3>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {(!completedWorkouts || completedWorkouts.length === 0) ? (
            <div style={{ padding: "30px", textAlign: "center", backgroundColor: "#1a1a1a", borderRadius: "12px", color: "#666" }}>
              No hay entrenamientos registrados aún.
            </div>
          ) : (
            [...completedWorkouts]
              .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
              .map(workout => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))
          )}
        </div>

        {viewingSummary && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "20px" }}>
            <div style={{ backgroundColor: "#1a1a1a", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "500px", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ color: "#1dd1a1", margin: 0 }}>{viewingSummary.name}</h2>
                <button onClick={() => setViewingSummary(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div style={{ backgroundColor: "#222", padding: "15px", borderRadius: "10px" }}>
                    <div style={{ color: "#888", fontSize: "0.8rem" }}>Volumen</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{viewingSummary.totalVolume?.toLocaleString()} kg</div>
                  </div>
                  <div style={{ backgroundColor: "#222", padding: "15px", borderRadius: "10px" }}>
                    <div style={{ color: "#888", fontSize: "0.8rem" }}>Series</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{viewingSummary.series}</div>
                  </div>
                </div>
                {(viewingSummary.details || viewingSummary.exercises) && (viewingSummary.details || viewingSummary.exercises).map((ex, i) => (
                  <div key={i} style={{ backgroundColor: "#222", padding: "15px", borderRadius: "10px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "8px" }}>{ex.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "#ccc" }}>
                      {ex.series && Array.isArray(ex.series) 
                        ? ex.series.map((s, si) => `${s.weight}kg x ${s.reps}`).join(" • ") 
                        : `${ex.reps || 0} reps x ${ex.series || 0} series`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#333', overflow: 'hidden', border: '2px solid #1dd1a1' }}>
                  {editData.photoURL ? <img src={editData.photoURL} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                </div>
                <label style={{ 
                  backgroundColor: '#222', 
                  color: '#1dd1a1', 
                  padding: '8px 15px', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontSize: '0.85rem',
                  border: '1px solid #333'
                }}>
                  Cambiar foto
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditData({ ...editData, photoURL: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
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
      {/* Follow Modals */}
      {(showFollowers || showFollowing) && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 4000, padding: "20px"
        }}>
          <div style={{ backgroundColor: "#1a1a1a", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: "#fff", margin: 0 }}>{showFollowers ? "Seguidores" : "Siguiendo"}</h2>
              <button onClick={() => { setShowFollowers(false); setShowFollowing(false); }} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {(showFollowers ? followersList : followingList).length === 0 ? (
                <p style={{ color: "#888", textAlign: "center" }}>No hay nadie aquí todavía.</p>
              ) : (
                (showFollowers ? followersList : followingList).map(u => (
                  <div 
                    key={u.id} 
                    onClick={() => {
                      router.push(`/user/${u.id}`);
                      setShowFollowers(false);
                      setShowFollowing(false);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "8px", borderRadius: "8px", transition: "background 0.2s" }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2a2a2a"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#333", overflow: "hidden" }}>
                      {u.photoURL && <img src={u.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", color: "#fff" }}>@{u.username}</div>
                      <div style={{ fontSize: "0.8rem", color: "#888" }}>{u.firstName}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Full Screen Photo Modal */}
      {isPhotoFullScreen && (
        <div 
          onClick={() => setIsPhotoFullScreen(false)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 5000, padding: "20px", cursor: "pointer"
          }}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsPhotoFullScreen(false); }}
              style={{
                position: "absolute", top: "-40px", right: "0",
                background: "none", border: "none", color: "#fff",
                fontSize: "2rem", cursor: "pointer"
              }}
            >
              &times;
            </button>
            <img 
              src={user?.photoURL || "/logo2.png"} 
              alt="Profile Full" 
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "10px" }}
            />
          </div>
        </div>
      )}
    </Layout>
  );
}
