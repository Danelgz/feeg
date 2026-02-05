import Link from "next/link";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const { theme } = useUser();
  const isDark = theme === 'dark';
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const links = [
    { name: "Feed", href: "/", icon: "🏠" },
    { name: "Rutinas", href: "/routines", icon: "📋" },
    { name: "Ejercicios", href: "/exercises", icon: "🏋️‍♂️" },
    { name: "Perfil", href: "/profile", icon: "👤" },
    { name: "Ajustes", href: "/settings", icon: "⚙️" }
  ];

  if (isMobile) {
    return (
      <>
        {/* Botón Hamburguesa */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: "fixed",
            top: "15px",
            right: "15px",
            zIndex: 2000,
            width: "45px",
            height: "45px",
            borderRadius: "50%",
            backgroundColor: "#1dd1a1",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "5px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            padding: "0"
          }}
        >
          <div style={{ width: "20px", height: "2px", backgroundColor: "#000", transition: "0.3s", transform: isOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <div style={{ width: "20px", height: "2px", backgroundColor: "#000", transition: "0.3s", opacity: isOpen ? 0 : 1 }} />
          <div style={{ width: "20px", height: "2px", backgroundColor: "#000", transition: "0.3s", transform: isOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>

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
          justifyContent: "center",
          alignItems: "center",
          gap: "25px",
          transition: "all 0.3s ease-in-out",
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          transform: isOpen ? "translateY(0)" : "translateY(-100%)"
        }}>
          <img 
            src={isDark ? "/logo.png" : "/logo2.png"} 
            alt="FEEG Logo" 
            style={{ 
              width: "180px", 
              height: "auto", 
              marginBottom: "20px"
            }} 
          />
          {links.map(link => (
            <Link 
              key={link.name} 
              href={link.href} 
              onClick={() => setIsOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                color: isDark ? "#fff" : "#333",
                fontSize: "1.5rem",
                gap: "15px",
                fontWeight: "600"
              }}
            >
              <span>{link.icon}</span>
              <span>{link.name}</span>
            </Link>
          ))}
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
      <div style={{ padding: "10px 0", marginBottom: "10px", textAlign: "center" }}>
        <img 
          src={isDark ? "/logo.png" : "/logo2.png"} 
          alt="FEEG Logo" 
          style={{ 
            width: "120px", 
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
