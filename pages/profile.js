import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import RegisterForm from "../components/RegisterForm";
import { useUser } from "../context/UserContext";

export default function Profile() {
  const { user, saveUser, isLoaded, theme, isMobile } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const isDark = theme === 'dark';

  if (!isLoaded) {
    return (
      <Layout>
        <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "1rem", color: isDark ? "#fff" : "#333" }}>Perfil</h1>
        <p style={{ color: isDark ? "#ccc" : "#666" }}>Cargando...</p>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div style={{ padding: isMobile ? "0" : "20px" }}>
          <RegisterForm onRegister={saveUser} />
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
      <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "1rem", color: isDark ? "#fff" : "#333" }}>Perfil</h1>
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
        <p style={{ color: isDark ? "#fff" : "#333" }}><strong>Nombre:</strong> {user.firstName} {user.lastName}</p>
        <p style={{ color: isDark ? "#ccc" : "#666" }}><strong>Nombre de Usuario:</strong> @{user.username}</p>
        <p style={{ color: isDark ? "#ccc" : "#666" }}><strong>Altura:</strong> {formatHeight()}</p>
        <p style={{ color: isDark ? "#ccc" : "#666" }}><strong>Peso:</strong> {formatWeight()}</p>
        <p style={{ color: isDark ? "#ccc" : "#666" }}><strong>Objetivo:</strong> {user.goal}</p>
        <p style={{ color: isDark ? "#999" : "#888", fontSize: "0.85rem" }}><strong>Registrado:</strong> {new Date(user.registeredAt).toLocaleDateString('es-ES')}</p>
        
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
          Editar Perfil
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
              <h2 style={{ color: isDark ? "#fff" : "#333", margin: 0 }}>Editar Perfil</h2>
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
