import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";

export default function Settings() {
  const { theme, toggleTheme, isMobile } = useUser();
  const isDark = theme === 'dark';

  return (
    <Layout>
      <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "1rem", color: isDark ? "#fff" : "#333" }}>Ajustes</h1>
      <div style={{
        backgroundColor: isDark ? "#1a1a1a" : "#fff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: isDark ? "0 2px 6px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.1)",
        border: isDark ? "1px solid #333" : "1px solid #e0e0e0",
        transition: "all 0.3s ease"
      }}>
        <div style={{ 
          display: "flex", 
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between", 
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? "15px" : "0"
        }}>
          <span style={{ color: isDark ? "#fff" : "#333", fontSize: "1.1rem" }}>
            Modo {isDark ? "oscuro" : "claro"}
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
            Cambiar a modo {isDark ? "claro" : "oscuro"}
          </button>
        </div>
      </div>
    </Layout>
  );
}
