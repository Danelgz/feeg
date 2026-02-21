import Link from "next/link";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const { theme, t, isMobile } = useUser();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [lastSwipeTime, setLastSwipeTime] = useState(0);

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch.clientY < 60) {
        setTouchStartY(touch.clientY);
      }
    };

    const handleTouchEnd = (e) => {
      if (touchStartY === null) return;
      
      const touch = e.changedTouches[0];
      const deltaY = touchStartY - touch.clientY;
      const now = Date.now();
      
      if (deltaY > 40 && touch.clientY < 60) {
        if (now - lastSwipeTime < 800) {
          setSwipeCount(prev => prev + 1);
          
          if (swipeCount + 1 >= 2) {
            setIsOpen(true);
            setSwipeCount(0);
          }
        } else {
          setSwipeCount(1);
        }
        setLastSwipeTime(now);
      }
      
      setTouchStartY(null);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, touchStartY, swipeCount, lastSwipeTime]);

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
          padding: "80px 40px", // Espacio para el botón de cerrar y margen lateral
          transition: "all 0.3s ease-in-out",
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          transform: isOpen ? "translateY(0)" : "translateY(-100%)"
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
                onClick={() => setIsOpen(false)}
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
