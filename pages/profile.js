import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import RegisterForm from "../components/RegisterForm";
import { useUser } from "../context/UserContext";
import { getFollowersList, getFollowingList, uploadProfilePhoto } from "../lib/firebase";

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
  const [saving, setSaving] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const handleDragStart = (e) => {
    if (!editData.photoURL) return;
    setIsDragging(true);
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    setDragStart({ 
      x: clientX - (editData.photoPosX || 0), 
      y: clientY - (editData.photoPosY || 0) 
    });
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    setEditData({
      ...editData,
      photoPosX: clientX - dragStart.x,
      photoPosY: clientY - dragStart.y
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const compressImage = (dataUrl, maxWidth = 500, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onerror = () => {
        console.error("Error cargando imagen para compresión");
        resolve(dataUrl); // Devolver original si falla
      };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

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
    photoURL: "",
    photoScale: 1,
    photoPosX: 0,
    photoPosY: 0
  });

  useEffect(() => {
    if (user) {
      setEditData({
        username: user.username || "",
        firstName: user.firstName || "",
        description: user.description || "Sin descripción",
        photoURL: user.photoURL || authUser?.photoURL || "",
        photoScale: user.photoScale || 1,
        photoPosX: user.photoPosX || 0,
        photoPosY: user.photoPosY || 0
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
    if (saving) return;
    setSaving(true);
    
    try {
      // Usamos directamente la foto que está en el estado (puede ser base64 o una URL pegada)
      const finalPhotoURL = editData.photoURL;
      
      const updatedUser = {
        ...user,
        username: editData.username,
        firstName: editData.firstName,
        description: editData.description,
        photoURL: finalPhotoURL,
        photoScale: editData.photoScale,
        photoPosX: editData.photoPosX,
        photoPosY: editData.photoPosY
      };
      
      // Guardamos directamente en Firestore
      // Esto funciona porque saveUser en UserContext ya llama a Firestore
      await saveUser(updatedUser);
      
      setIsEditing(false);
    } catch (e) {
      console.error("Error en handleEditSave:", e);
      alert(e.message || "Hubo un problema al guardar.");
    } finally {
      setSaving(false);
    }
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
          <button onClick={() => router.push(`/routines/${workout.routineId || 'view'}?viewWorkoutId=${workout.id}`)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1dd1a1", fontSize: "0.85rem" }}>Resumen</button>
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
    <>
      <Layout>
      <div style={{
        backgroundColor: "#000",
        color: "#fff",
        minHeight: "100vh",
        padding: isMobile ? "10px" : "20px"
      }}>
        {/* Header - Username and Icons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "800", margin: 0, letterSpacing: "-0.5px" }}>{user?.username || "Usuario"}</h1>
          <div style={{ display: "flex", gap: "18px" }}>
            <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: "5px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: "5px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0 1.51-1V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </div>
        </div>

        {/* Real Name */}
        <div style={{ fontSize: "1rem", color: "#1dd1a1", fontWeight: "600", marginBottom: "20px" }}>
          {user?.firstName || "Sin nombre"}
        </div>

        {/* Photo and Stats Row */}
        <div style={{ display: "flex", gap: "25px", alignItems: "center", marginBottom: "25px" }}>
          <div 
            onClick={() => setIsPhotoFullScreen(true)}
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              cursor: "pointer",
              border: "3px solid #1dd1a1",
              boxShadow: "0 8px 24px rgba(29, 209, 161, 0.2)",
              flexShrink: 0
            }}
          >
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Perfil" 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover",
                  transform: `scale(${user.photoScale || 1}) translate(${user.photoPosX || 0}px, ${user.photoPosY || 0}px)`
                }} 
              />
            ) : <span style={{ fontSize: "2rem" }}>👤</span>}
          </div>
          
          <div style={{ flex: 1, display: "flex", justifyContent: "space-between", textAlign: "center" }}>
            <div style={{ cursor: "pointer" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>{completedWorkouts?.length || 0}</div>
              <div style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Entrenos</div>
            </div>
            <div onClick={handleOpenFollowers} style={{ cursor: "pointer" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>{followers?.length || 0}</div>
              <div style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Seguidores</div>
            </div>
            <div onClick={handleOpenFollowing} style={{ cursor: "pointer" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>{following?.length || 0}</div>
              <div style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Siguiendo</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ 
          marginBottom: "30px", 
          fontSize: "0.95rem", 
          color: "#ccc", 
          lineHeight: "1.5", 
          backgroundColor: "#111", 
          padding: "12px 15px", 
          borderRadius: "12px",
          borderLeft: "3px solid #1dd1a1"
        }}>
          {user?.description || "Sin descripción"}
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
      </div>

      </Layout>

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
          backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 2000, padding: "20px",
          backdropFilter: "blur(20px)"
        }}>
          <div style={{ 
            backgroundColor: "#111", 
            padding: "30px", 
            borderRadius: "24px", 
            width: "100%", 
            maxWidth: "400px",
            border: "1px solid #333",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            position: 'relative'
          }}>
            <h2 style={{ 
              color: "#fff", 
              marginBottom: "25px", 
              textAlign: "center", 
              fontSize: "1.4rem",
              fontWeight: "800"
            }}>Editar Perfil</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                <div style={{ position: 'relative', cursor: 'move' }}>
                  <div style={{ 
                    width: '150px', 
                    height: '150px', 
                    borderRadius: '50%', 
                    backgroundColor: '#000', 
                    overflow: 'hidden', 
                    border: '3px solid #1dd1a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    boxShadow: '0 0 20px rgba(29, 209, 161, 0.3)'
                  }}>
                    {editData.photoURL ? (
                      <img 
                        src={editData.photoURL} 
                        alt="Preview" 
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                        onTouchStart={handleDragStart}
                        onTouchMove={handleDragMove}
                        onTouchEnd={handleDragEnd}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          transform: `scale(${editData.photoScale || 1}) translate(${editData.photoPosX || 0}px, ${editData.photoPosY || 0}px)`,
                          cursor: isDragging ? 'grabbing' : 'grab',
                          userSelect: 'none',
                          touchAction: 'none',
                          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                        }} 
                      />
                    ) : <span style={{ fontSize: '3rem' }}>👤</span>}
                    
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '0',
                      right: '0',
                      textAlign: 'center',
                      fontSize: '0.65rem',
                      color: '#fff',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                      pointerEvents: 'none',
                      opacity: 0.8
                    }}>
                      Arrastra para ajustar
                    </div>
                  </div>
                  
                  <label style={{ 
                    position: 'absolute',
                    bottom: '5px',
                    right: '5px',
                    backgroundColor: '#1dd1a1', 
                    color: '#000', 
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%', 
                    cursor: 'pointer', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #111',
                    zIndex: 10
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      disabled={isProcessingImage}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setIsProcessingImage(true);
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const compressed = await compressImage(reader.result);
                            setEditData({ ...editData, photoURL: compressed, photoScale: 1, photoPosX: 0, photoPosY: 0 });
                            setIsProcessingImage(false);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <div style={{ width: '100%', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <span>ZOOM</span>
                    <span>{(editData.photoScale || 1).toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={editData.photoScale || 1}
                    onChange={(e) => setEditData({...editData, photoScale: parseFloat(e.target.value)})}
                    style={{
                      width: '100%',
                      accentColor: '#1dd1a1',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: "#888", fontSize: "0.8rem", fontWeight: "600" }}>URL de la foto (opcional)</label>
                <input 
                  value={editData.photoURL?.startsWith('data:') ? '' : editData.photoURL} 
                  onChange={e => setEditData({...editData, photoURL: e.target.value, photoScale: 1, photoPosX: 0, photoPosY: 0})}
                  placeholder="https://ejemplo.com/mi-foto.png"
                  style={{ width: "100%", padding: "12px 15px", borderRadius: "12px", border: "1px solid #333", backgroundColor: "#000", color: "#fff", outline: "none", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#666" }}>O selecciona una foto arriba para subirla automáticamente</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: "#888", fontSize: "0.8rem", fontWeight: "600" }}>Usuario</label>
                <input 
                  value={editData.username} 
                  onChange={e => setEditData({...editData, username: e.target.value})}
                  placeholder="Usuario"
                  style={{ width: "100%", padding: "12px 15px", borderRadius: "12px", border: "1px solid #333", backgroundColor: "#000", color: "#fff", outline: "none" }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: "#888", fontSize: "0.8rem", fontWeight: "600" }}>Nombre</label>
                <input 
                  value={editData.firstName} 
                  onChange={e => setEditData({...editData, firstName: e.target.value})}
                  placeholder="Nombre"
                  style={{ width: "100%", padding: "12px 15px", borderRadius: "12px", border: "1px solid #333", backgroundColor: "#000", color: "#fff", outline: "none" }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: "#888", fontSize: "0.8rem", fontWeight: "600" }}>Descripción</label>
                <textarea 
                  value={editData.description} 
                  onChange={e => setEditData({...editData, description: e.target.value})}
                  placeholder="Descripción"
                  style={{ width: "100%", padding: "12px 15px", borderRadius: "12px", border: "1px solid #333", backgroundColor: "#000", color: "#fff", minHeight: "80px", resize: "none", outline: "none" }}
                />
              </div>
              
              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button 
                  onClick={() => setIsEditing(false)} 
                  disabled={saving}
                  style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid #333", backgroundColor: "transparent", color: "#fff", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleEditSave} 
                  disabled={saving}
                  style={{ 
                    flex: 2, 
                    padding: "14px", 
                    borderRadius: "12px", 
                    border: "none", 
                    backgroundColor: "#1dd1a1", 
                    color: "#000", 
                    fontWeight: "800",
                    cursor: saving ? "default" : "pointer",
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
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
    </>
  );
}
