import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useState } from "react";

export default function BottomNavigation() {
  const { theme, t } = useUser();
  const router = useRouter();
  const isDark = theme === 'dark';
  const [showMenu, setShowMenu] = useState(false);

  const allCategories = [
    { name: t("feed"), href: "/" },
    { name: t("routines"), href: "/routines" },
    { name: t("exercises"), href: "/exercises" },
    { name: t("ia"), href: "/ia" },
    { name: t("food"), href: "/food" },
    { name: t("statistics"), href: "/statistics" },
    { name: t("profile"), href: "/profile" },
    { name: t("exportar_datos"), href: "/export-data" },
    { name: t("settings"), href: "/settings" }
  ];

  const navItems = [
    { 
      name: t("feed"), 
      href: "/", 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9,22 9,12 15,12 15,22"></polyline>
        </svg>
      )
    },
    { 
      name: t("routines"), 
      href: "/routines", 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>
      )
    },
    { 
      name: t("profile"), 
      href: "/profile", 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    },
    { 
      name: t("menu"), 
      action: true,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      )
    }
  ];

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
      borderTop: isDark ? "2px solid #333" : "2px solid #e0e0e0",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "8px 0",
      zIndex: 1000,
      boxShadow: isDark ? "0 -2px 10px rgba(0,0,0,0.3)" : "0 -2px 10px rgba(0,0,0,0.1)"
    }}>
      {navItems.map(item => {
        if (item.action) {
          return (
            <button
              key={item.name}
              onClick={() => setShowMenu(!showMenu)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textDecoration: "none",
                color: showMenu ? "#1dd1a1" : (isDark ? "#999" : "#666"),
                transition: "all 0.2s ease",
                padding: "5px 10px",
                borderRadius: "8px",
                minWidth: "60px",
                border: "none",
                background: "transparent",
                cursor: "pointer"
              }}
              onMouseOver={(e) => {
                if (!showMenu) {
                  e.currentTarget.style.color = "#1dd1a1";
                  e.currentTarget.style.backgroundColor = isDark ? "#2a2a2a" : "#f5f5f5";
                }
              }}
              onMouseOut={(e) => {
                if (!showMenu) {
                  e.currentTarget.style.color = isDark ? "#999" : "#666";
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span style={{
                fontSize: "1.5rem",
                marginBottom: "2px",
                display: "block"
              }}>
                {item.icon}
              </span>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: showMenu ? "bold" : "normal",
                textAlign: "center"
              }}>
                {item.name}
              </span>
            </button>
          );
        }
        
        const isActive = router.pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textDecoration: "none",
              color: isActive ? "#1dd1a1" : (isDark ? "#999" : "#666"),
              transition: "all 0.2s ease",
              padding: "5px 10px",
              borderRadius: "8px",
              minWidth: "60px"
            }}
            onMouseOver={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#1dd1a1";
                e.currentTarget.style.backgroundColor = isDark ? "#2a2a2a" : "#f5f5f5";
              }
            }}
            onMouseOut={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = isDark ? "#999" : "#666";
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span style={{
              fontSize: "1.5rem",
              marginBottom: "2px",
              display: "block"
            }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: isActive ? "bold" : "normal",
              textAlign: "center"
            }}>
              {item.name}
            </span>
          </Link>
        );
      })}

      {showMenu && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? "rgba(15, 15, 15, 0.98)" : "rgba(255, 255, 255, 0.98)",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px",
          backdropFilter: "blur(5px)",
          overflow: "hidden"
        }}>
          <button
            onClick={() => setShowMenu(false)}
            style={{
              position: "sticky",
              top: "20px",
              right: 0,
              width: "40px",
              height: "40px",
              backgroundColor: "#1dd1a1",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              color: "#000",
              fontSize: "24px",
              fontWeight: "bold",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1001,
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(29, 209, 161, 0.3)",
              alignSelf: "flex-end",
              marginBottom: "10px"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(29, 209, 161, 0.5)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(29, 209, 161, 0.3)";
            }}
          >
            ×
          </button>

          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: "400px"
          }}>
            <div style={{
              textAlign: "center",
              marginBottom: "30px"
            }}>
              <img 
                src={isDark ? "/logo.png" : "/logo2.png"} 
                alt="FEEG Logo" 
                style={{ 
                  width: "100px", 
                  height: "auto",
                  marginBottom: "15px"
                }} 
              />
              <h2 style={{
                color: isDark ? "#fff" : "#333",
                fontSize: "1.5rem",
                fontWeight: "700",
                margin: "0",
                letterSpacing: "1px"
              }}>
                {t("menu")}
              </h2>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "100%",
              maxHeight: "calc(100vh - 250px)",
              overflowY: "auto",
              paddingRight: "8px"
            }}>
              {allCategories.map(category => (
                <Link
                  key={category.name}
                  href={category.href}
                  onClick={() => setShowMenu(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    padding: "16px 20px",
                    backgroundColor: isDark ? "#2a2a2a" : "#ffffff",
                    color: isDark ? "#fff" : "#333",
                    textDecoration: "none",
                    borderRadius: "10px",
                    border: "2px solid #1dd1a1",
                    fontWeight: "600",
                    fontSize: "1rem",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    boxShadow: isDark 
                      ? "0 2px 8px rgba(0, 0, 0, 0.2)" 
                      : "0 2px 8px rgba(0, 0, 0, 0.1)"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#1dd1a1";
                    e.currentTarget.style.color = "#000";
                    e.currentTarget.style.transform = "translateX(8px)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(29, 209, 161, 0.4)";
                    e.currentTarget.style.fontWeight = "700";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? "#2a2a2a" : "#ffffff";
                    e.currentTarget.style.color = isDark ? "#fff" : "#333";
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.boxShadow = isDark 
                      ? "0 2px 8px rgba(0, 0, 0, 0.2)" 
                      : "0 2px 8px rgba(0, 0, 0, 0.1)";
                    e.currentTarget.style.fontWeight = "600";
                  }}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
