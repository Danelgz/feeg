import Link from "next/link";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const { theme } = useUser();
  const isDark = theme === 'dark';
  const [isMobile, setIsMobile] = useState(false);

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
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "70px",
        backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        borderTop: isDark ? "1px solid #333" : "1px solid #e0e0e0",
        zIndex: 1000,
        padding: "0 10px"
      }}>
        {links.map(link => (
          <Link key={link.name} href={link.href} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textDecoration: "none",
            color: isDark ? "#fff" : "#333",
            fontSize: "0.7rem",
            gap: "5px"
          }}>
            <span style={{ fontSize: "1.2rem" }}>{link.icon}</span>
            <span>{link.name}</span>
          </Link>
        ))}
      </nav>
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
      <h2 style={{ margin: 0, color: isDark ? "#fff" : "#333", fontSize: "1.5rem" }}>FEEG</h2>
      {links.map(link => (
        <Link key={link.name} href={link.href} style={{
          color: isDark ? "#fff" : "#333",
          textDecoration: "none",
          padding: "10px",
          borderRadius: "5px",
          transition: "0.2s",
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          <span>{link.icon}</span>
          <span>{link.name}</span>
        </Link>
      ))}
    </aside>
  );
}
