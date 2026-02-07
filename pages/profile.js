import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import RegisterForm from "../components/RegisterForm";
import { useUser } from "../context/UserContext";

export default function Profile() {
  const { user, authUser, saveUser, isLoaded, theme, isMobile, t, loginWithGoogle, logout } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const isDark = theme === 'dark';

  if (!isLoaded) {
    return (
      <Layout>
        <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "1rem", color: isDark ? "#fff" : "#333" }}>{t("profile_title")}</h1>
        <p style={{ color: isDark ? "#ccc" : "#666" }}>{t("loading")}</p>
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
      <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "1rem", color: isDark ? "#fff" : "#333" }}>{t("profile_title")}</h1>
      <div style={{
        backgroundColor: isDark ? "#1a1a1a" : "#fff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: isDark ? "0 2px 6px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.05)",
        border: `1px solid ${isDark ? "#333" : "#eee"}`,
        maxWidth: "600px",
        width: isMobile ? "100%" : "auto",
        boxSizing: "border-box"
      }}>
        {authUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            {authUser.photoURL && <img src={authUser.photoURL} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%' }} />}
            <div style={{ color: isDark ? '#fff' : '#333' }}>
              <div style={{ fontWeight: 600 }}>{authUser.displayName || `${user.firstName} ${user.lastName}`}</div>
              {authUser.email && <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{authUser.email}</div>}
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={logout} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: isDark ? '#111' : '#fafafa', color: isDark ? '#fff' : '#333', cursor: 'pointer' }}>Cerrar sesión</button>
          </div>
        )}
        <p style={{ color: isDark ? "#fff" : "#333" }}><strong>{t("name_label")}</strong> {user.firstName} {user.lastName}</p>
        <p style={{ color: isDark ? "#ccc" : "#666" }}><strong>{t("username_label")}</strong> @{user.username}</p>
        <p style={{ color: isDark ? "#ccc" : "#666" }}><strong>{t("height_label_full")}</strong> {formatHeight()}</p>
        <p style={{ color: isDark ? "#ccc" : "#666" }}><strong>{t("weight_label_full")}</strong> {formatWeight()}</p>
        <p style={{ color: isDark ? "#ccc" : "#666" }}><strong>{t("goal_label")}</strong> {user.goal}</p>
        <p style={{ color: isDark ? "#999" : "#888", fontSize: "0.85rem" }}><strong>{t("registered_label")}</strong> {new Date(user.registeredAt).toLocaleDateString(t("language") === 'eu' ? 'eu-ES' : 'es-ES')}</p>
        
        <button
          onClick={() => setIsEditing(true)}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#1dd1a1",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.3s ease"
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#19b088";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#1dd1a1";
          }}
        >
          {t("edit_profile")}
        </button>
      </div>

      {isEditing && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: isDark ? "#1a1a1a" : "#fff",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            border: `1px solid ${isDark ? "#333" : "#ddd"}`,
            maxWidth: "500px",
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: isDark ? "#fff" : "#333", margin: 0 }}>{t("edit_profile")}</h2>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: isDark ? "#fff" : "#333",
                  fontSize: "1.5rem",
                  cursor: "pointer"
                }}
              >
                ×
              </button>
            </div>
            <RegisterForm onRegister={(updatedUser) => {
              saveUser(updatedUser);
              setIsEditing(false);
            }} />
          </div>
        </div>
      )}
    </Layout>
  );
}
