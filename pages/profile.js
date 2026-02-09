import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import RegisterForm from "../components/RegisterForm";
import { useUser } from "../context/UserContext";

export default function Profile() {
  const router = useRouter();
  const { user, authUser, saveUser, isLoaded, isSyncing, theme, isMobile, t, loginWithGoogle, logout } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: user?.username || "",
    firstName: user?.firstName || "",
    description: user?.description || "Sin descripción",
    photoURL: user?.photoURL || authUser?.photoURL || ""
  });

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
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>({user?.username || "Nombre_usuario"})</h1>
          <div style={{ display: "flex", gap: "15px" }}>
            <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
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
            {user?.photoURL ? <img src={user.photoURL} alt="Perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "(Perfil)"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>({user?.firstName || "Nombre"})</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", textAlign: "center" }}>
              <div>
                <div style={{ color: "#aaa", fontSize: "0.8rem" }}>Entrenos</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>230</div>
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
          ({user?.description || "DESCRIPCIÓN DEL USUARIO"})
        </div>

        {/* Graph Section */}
        <div style={{ marginBottom: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h2 style={{ fontSize: "1.1rem", margin: 0 }}>(Gráfico horas por semana)</h2>
            <div style={{ color: "#008CFF", fontSize: "0.9rem", cursor: "pointer" }}>Últimos 3 meses ∨</div>
          </div>
          
          <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "20px" }}>
            {[40, 45, 48, 55, 70, 95, 90, 60, 80, 75, 82, 78, 20].map((h, i) => (
              <div key={i} style={{ 
                flex: 1, 
                backgroundColor: i === 12 ? "#008CFF" : "#008CFF", 
                height: `${h}%`, 
                borderRadius: "2px" 
              }} />
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
            {["Duración", "Volumen", "Repeticiones"].map((label, i) => (
              <button key={label} style={{
                flex: 1,
                padding: "8px",
                borderRadius: "20px",
                border: "none",
                backgroundColor: i === 0 ? "#008CFF" : "#1a1a1a",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: "500"
              }}>{label}</button>
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
        <h3 style={{ fontSize: "1.1rem", color: "#888", marginBottom: "15px" }}>Entrenamientos</h3>
        <div style={{ color: "#fff", fontWeight: "bold" }}>(Todos los entrenamientos)</div>
      </div>

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
                <button onClick={handleEditSave} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#008CFF", color: "#fff", fontWeight: "bold" }}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
