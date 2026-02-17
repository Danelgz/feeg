import { useEffect } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";

export default function Settings() {
  const { theme, toggleTheme, isMobile, language, updateLanguage, t, authUser, loginWithGoogle, logout, refreshData } = useUser();

  // Forzar refresco de datos al entrar a ajustes
  useEffect(() => {
    if (authUser) {
      refreshData();
    }
  }, [authUser]);

  const isDark = theme === 'dark';

  const languages = [
    { code: 'es', name: 'Español' },
    { code: 'eu', name: 'Euskera' }
  ];

  const handleSwitchAccount = async () => {
    await logout();
    await loginWithGoogle();
  };

  return (
    <Layout>
      <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "1rem", color: isDark ? "#fff" : "#333" }}>
        {t("settings")}
      </h1>
      <div style={{
        backgroundColor: isDark ? "#1a1a1a" : "#fff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: isDark ? "0 2px 6px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.1)",
        border: isDark ? "1px solid #333" : "1px solid #e0e0e0",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
        gap: "25px"
      }}>
        {/* Apartado de Cuenta */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          gap: "15px"
        }}>
          <span style={{ color: "#1dd1a1", fontSize: "1.1rem", fontWeight: "bold" }}>
            {t("google_account")}
          </span>
          
          {authUser ? (
            <div style={{ 
              display: "flex", 
              flexDirection: isMobile ? "column" : "row", 
              justifyContent: "space-between", 
              alignItems: isMobile ? "flex-start" : "center", 
              gap: "15px", 
              backgroundColor: isDark ? "#222" : "#f9f9f9", 
              padding: "15px", 
              borderRadius: "12px",
              border: isDark ? "none" : "1px solid #eee"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "45px", height: "45px", borderRadius: "50%", overflow: "hidden", border: "2px solid #1dd1a1", backgroundColor: isDark ? "#333" : "#eee" }}>
                  {authUser.photoURL ? <img src={authUser.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: "0.7rem" }}>{t("no_pfp")}</div>}
                </div>
                <div>
                  <div style={{ color: isDark ? "#fff" : "#333", fontWeight: "600" }}>{authUser.displayName || "Usuario"}</div>
                  <div style={{ color: "#888", fontSize: "0.85rem" }}>{authUser.email}</div>
                </div>
              </div>
              <button 
                onClick={handleSwitchAccount}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "transparent",
                  color: "#1dd1a1",
                  border: "1px solid #1dd1a1",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.2s",
                  width: isMobile ? "100%" : "auto"
                }}
                onMouseOver={(e) => { e.target.style.backgroundColor = "rgba(29, 209, 161, 0.1)"; }}
                onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; }}
              >
                {t("change_account")}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
              <button 
                onClick={loginWithGoogle}
                style={{
                  flex: 1,
                  padding: "14px",
                  backgroundColor: "#1dd1a1",
                  color: "#000",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px"
                }}
              >
                {t("login_google")}
              </button>
              <button 
                onClick={loginWithGoogle}
                style={{
                  flex: 1,
                  padding: "14px",
                  backgroundColor: "transparent",
                  color: isDark ? "#fff" : "#333",
                  border: isDark ? "1px solid #333" : "1px solid #ddd",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                {t("register")}
              </button>
            </div>
          )}
        </div>

        {/* Separador */}
        <div style={{ height: "1px", backgroundColor: isDark ? "#333" : "#eee" }} />

        {/* Apartado de Tema */}
        <div style={{ 
          display: "flex", 
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between", 
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? "15px" : "0"
        }}>
          <span style={{ color: isDark ? "#fff" : "#333", fontSize: "1.1rem" }}>
            {isDark ? t("dark_mode") : t("light_mode")}
          </span>
          <button 
            onClick={toggleTheme}
            style={{
              padding: "10px 16px",
              backgroundColor: "#1dd1a1",
              color: "#000",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "opacity 0.2s",
              width: isMobile ? "100%" : "auto"
            }}
            onMouseOver={(e) => e.target.style.opacity = "0.8"}
            onMouseOut={(e) => e.target.style.opacity = "1"}
          >
            {isDark ? t("change_to_light") : t("change_to_dark")}
          </button>
        </div>

        {/* Separador */}
        <div style={{ height: "1px", backgroundColor: isDark ? "#333" : "#eee" }} />

        {/* Apartado de Idioma */}
        <div style={{ 
          display: "flex", 
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between", 
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? "15px" : "0"
        }}>
          <span style={{ color: isDark ? "#fff" : "#333", fontSize: "1.1rem" }}>
            {t("language")}
          </span>
          <select
            value={language}
            onChange={(e) => updateLanguage(e.target.value)}
            style={{
              padding: "10px 16px",
              backgroundColor: isDark ? "#2a2a2a" : "#f9f9f9",
              color: isDark ? "#fff" : "#333",
              border: `2px solid ${isDark ? "#333" : "#ddd"}`,
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "1rem",
              width: isMobile ? "100%" : "200px",
              outline: "none",
              transition: "border-color 0.3s ease"
            }}
            onFocus={(e) => e.target.style.borderColor = "#1dd1a1"}
            onBlur={(e) => e.target.style.borderColor = isDark ? "#333" : "#ddd"}
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Layout>
  );
}
