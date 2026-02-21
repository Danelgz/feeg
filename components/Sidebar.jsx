import Link from "next/link";
import { useUser } from "../context/UserContext";

export default function Sidebar() {
  const { theme, t, isMobile, isMenuOpen, setIsMenuOpen } = useUser();
  const isDark = theme === 'dark';

  const links = [
    { name: t("feed"), href: "/", icon: "" },
    { name: t("routines"), href: "/routines", icon: "" },
    { name: t("exercises"), href: "/exercises", icon: "" },
    { name: t("ia"), href: "/ia", icon: "" },
    { name: t("food"), href: "/food", icon: "" },
    { name: t("statistics"), href: "/statistics", icon: "" },
    { name: t("profile"), href: "/profile", icon: "" },
    { name: t("exportar_datos"), href: "/export-data", icon: "" },
    { name: t("settings"), href: "/settings", icon: "" }
  ];

  if (isMobile) {
    return (
      <>
        {/* Menú Desplegable */}
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
          backgroundColor: isDark ? "rgba(15, 15, 15, 0.98)" : "rgba(255, 255, 255, 0.98)",
          zIndex: 1500,
          display: "flex",
          flexDirection: "column",
          padding: "80px 40px",
          transition: "all 0.3s ease-in-out",
          opacity: isMenuOpen ? 1 : 0,
          visibility: isMenuOpen ? "visible" : "hidden",
          transform: isMenuOpen ? "translateY(0)" : "translateY(-100%)"
        }}>
          {/* Enlaces arriba a la izquierda */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            alignItems: "flex-start",
            flex: 1
          }}>
            {links.map(link => (
              <Link 
                key={link.name} 
                href={link.href} 
                onClick={() => setIsMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  textDecoration: "none",
                  color: isDark ? "#fff" : "#333",
                  fontSize: "1.3rem",
                  gap: "15px",
                  fontWeight: "600"
                }}
              >
                <span>{link.icon}</span>
                <span>{link.name}</span>
              </Link>
            ))}
          </div>

          {/* Logo abajo centrado */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            paddingBottom: "40px"
          }}>
            <img 
              src={isDark ? "/logo.png" : "/logo2.png"} 
              alt="FEEG Logo" 
              style={{ 
                width: "120px", 
                height: "auto"
              }} 
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <aside style={{
      width: "220px",
      backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
      color: isDark ? "#fff" : "#333",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
      minHeight: "100vh",
      borderRight: isDark ? "2px solid #333" : "2px solid #e0e0e0",
      transition: "all 0.3s ease"
    }}>
      <div style={{ padding: "10px 0", marginBottom: "20px", textAlign: "center" }}>
        <img 
          src={isDark ? "/logo.png" : "/logo2.png"} 
          alt="FEEG Logo" 
          style={{ 
            width: "100px", 
            height: "auto"
          }} 
        />
      </div>
      {links.map(link => (
        <Link 
          key={link.name} 
          href={link.href} 
          style={{
            color: isDark ? "#fff" : "#333",
            textDecoration: "none",
            padding: "10px",
            borderRadius: "5px",
            transition: "0.2s",
            backgroundColor: "transparent",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? "#2a2a2a" : "#f5f5f5";
            e.currentTarget.style.color = "#1dd1a1";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = isDark ? "#fff" : "#333";
          }}
        >
          <span>{link.icon}</span>
          <span>{link.name}</span>
        </Link>
      ))}
    </aside>
  );
}
