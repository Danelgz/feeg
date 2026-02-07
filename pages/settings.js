import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";

export default function Settings() {
  const { theme, toggleTheme, isMobile, language, updateLanguage, t } = useUser();
  const isDark = theme === 'dark';

  const languages = [
    { code: 'es', name: 'Español' },
    { code: 'eu', name: 'Euskera (en desarrollo)' }
  ];

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
