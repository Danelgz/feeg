import Sidebar from "./Sidebar";
import BottomNavigation from "./BottomNavigation";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function Layout({ children }) {
  const { theme, isMobile, activeRoutine, endRoutine, t } = useUser();
  const isDark = theme === 'dark';
  const [isMounted, setIsMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [isIntroExiting, setIsIntroExiting] = useState(false);
  const router = useRouter();

  // Usar useEffect para evitar problemas de SSR con sessionStorage
  useEffect(() => {
    setIsMounted(true);
    const introPlayed = sessionStorage.getItem("introPlayed");
    if (isMobile && !introPlayed) {
      setShowIntro(true);
    }
  }, [isMobile]);

  const topLevelPages = ["/", "/routines", "/exercises", "/statistics", "/profile", "/settings", "/statistics/[view]", "/routines/create", "/routines/[id]", "/routines/empty", "/user/[uid]"];
  const isTopLevel = topLevelPages.includes(router.pathname) || topLevelPages.includes(router.asPath);

  // Botón de retroceso inteligente: si no hay historial o la entrada es directa, ir a una ruta de respaldo
  const smartBack = () => {
    try {
      if (typeof window !== 'undefined') {
        const canGoBack = window.history.length > 1;
        const ref = document.referrer || '';
        const sameOrigin = ref && ref.startsWith(window.location.origin);
        if (canGoBack && sameOrigin) {
          router.back();
          return;
        }
      }
    } catch (_) {}

    const p = router.asPath || '';
    let fallback = '/';
    if (p.startsWith('/statistics')) fallback = '/statistics';
    else if (p.startsWith('/routines')) fallback = '/routines';
    else if (p.startsWith('/exercises')) fallback = '/exercises';
    else if (p.startsWith('/profile')) fallback = '/profile';
    else if (p.startsWith('/settings')) fallback = '/settings';

    router.push(fallback);
  };

  const currentIsMobile = isMobile;

  useEffect(() => {
    // Aplicar color de fondo al body para evitar bordes blancos y mejorar el scroll en móvil
    document.body.style.backgroundColor = isDark ? "#0f0f0f" : "#f0f2f5";
    document.documentElement.style.backgroundColor = isDark ? "#0f0f0f" : "#f0f2f5";
  }, [isDark]);

  useEffect(() => {
    if (showIntro) {
      // Iniciar salida un poco antes del final del timer total
      const exitTimer = setTimeout(() => {
        setIsIntroExiting(true);
      }, 2000);

      const timer = setTimeout(() => {
        setShowIntro(false);
        setIsIntroExiting(false);
        sessionStorage.setItem("introPlayed", "true");
        if (router.pathname !== "/") {
          router.push("/");
        }
      }, 2500); 
      return () => {
        clearTimeout(timer);
        clearTimeout(exitTimer);
      };
    }
  }, [showIntro, router]);

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: currentIsMobile ? "column" : "row",
      minHeight: "100vh", 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'", 
      backgroundColor: isDark ? "#0f0f0f" : "#f0f2f5",
      color: isDark ? "#fff" : "#333",
      transition: "background-color 0.3s ease",
    }}>
      <Head>
        <title>FEEG - Tu App de Entrenamiento</title>
        <link rel="icon" href="/logo3.png" />
        <link rel="apple-touch-icon" href="/logo3.png" />
        <link rel="shortcut icon" href="/logo3.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <style>{`
          html, body {
            margin: 0;
            padding: 0;
            background-color: ${isDark ? "#0f0f0f" : "#f0f2f5"};
            transition: background-color 0.3s ease;
            height: 100%;
            width: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          * {
            font-family: inherit;
          }
          #__next {
            min-height: 100%;
          }
          @keyframes fadeInPage {
            0% {
              opacity: 0;
              transform: translateY(5px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .page-transition {
            animation: fadeInPage 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
            will-change: opacity, transform;
          }
        `}</style>
      </Head>

      {isMounted && (
        <>
          {/* Intro de Logo (Solo Móvil) */}
          {showIntro && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: isDark ? "#0f0f0f" : "#f0f2f5",
              zIndex: 10000,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              touchAction: "none",
              pointerEvents: "all",
              transition: "opacity 0.5s ease-in-out",
              opacity: isIntroExiting ? 0 : 1
            }}>
              <img
                src={isDark ? "/logo.png" : "/logo2.png"}
                alt="FEEG Logo"
                style={{
                  width: "180px",
                  height: "auto",
                  animation: "logoPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), pulseLogo 2s ease-in-out infinite 0.8s",
                  transition: "transform 0.5s ease-in-out",
                  transform: isIntroExiting ? "scale(1.2)" : "scale(1)"
                }}
              />
              <style>{`
                @keyframes logoPop {
                  0% { transform: scale(0.5); opacity: 0; }
                  100% { transform: scale(1); opacity: 1; }
                }
                @keyframes pulseLogo {
                  0% { transform: scale(1); }
                  50% { transform: scale(1.05); }
                  100% { transform: scale(1); }
                }
              `}</style>
            </div>
          )}

          {(!showIntro || isIntroExiting) && (
            <>
              <Sidebar />
              
              {/* Botón de Retroceder */}
              {!isTopLevel && (
                <button
                  onClick={smartBack}
                  title="Atrás"
                  aria-label="Atrás"
                  style={{
                    position: "fixed",
                    top: "15px",
                    left: currentIsMobile ? "15px" : "235px", 
                    zIndex: 2000,
                    width: currentIsMobile ? "36px" : "45px",
                    height: currentIsMobile ? "36px" : "45px",
                    borderRadius: "50%",
                    backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
                    border: `2px solid #1dd1a1`,
                    color: "#1dd1a1",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: currentIsMobile ? "1rem" : "1.2rem",
                    fontWeight: "bold",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#1dd1a1";
                    e.currentTarget.style.color = "#000";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? "#1a1a1a" : "#ffffff";
                    e.currentTarget.style.color = "#1dd1a1";
                  }}
                >
                  ←
                </button>
              )}

              <main 
                key={router.asPath}
                className="page-transition"
                style={{ 
                  flex: 1, 
                  padding: currentIsMobile ? "0" : "20px", 
                  paddingBottom: currentIsMobile ? "80px" : "20px",
                  backgroundColor: isDark ? "#0f0f0f" : "#f0f2f5", 
                  color: isDark ? "#fff" : "#333",
                  transition: "background-color 0.3s ease",
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                {children}
              </main>

              {/* Navegación Inferior para Móvil */}
              {currentIsMobile && <BottomNavigation />}

              {/* Pestaña de Rutina Activa */}
              {activeRoutine && router.asPath !== (activeRoutine?.id ? `/routines/${activeRoutine.id}` : activeRoutine.path) && (
                <div style={{
                  position: "fixed",
                  bottom: currentIsMobile ? "80px" : "20px",
                  right: "20px",
                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                  border: "2px solid #1dd1a1",
                  borderRadius: "12px",
                  padding: "15px",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.4)",
                  zIndex: 3000,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  minWidth: "220px",
                  animation: "fadeInUp 0.3s ease-out"
                }}>
                  <style>{`
                    @keyframes fadeInUp {
                      from { opacity: 0; transform: translateY(20px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ 
                        fontSize: "0.75rem", 
                        color: isDark ? "#aaa" : "#666", 
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        fontWeight: "bold"
                      }}>
                        {t("active_routine_in_progress")}
                      </span>
                      <span style={{ 
                        fontWeight: "bold", 
                        color: isDark ? "#fff" : "#333", 
                        fontSize: "1.1rem",
                        marginTop: "2px"
                      }}>
                        {activeRoutine.name}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(confirm(t("delete_routine_confirmation"))) endRoutine(); }}
                      title={t("delete_routine_short")}
                      style={{
                        background: isDark ? "#333" : "#eee",
                        border: "none",
                        color: "#ff4d4d",
                        cursor: "pointer",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                      onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >×</button>
                  </div>
                  <button 
                    onClick={() => router.push(activeRoutine?.id ? `/routines/${activeRoutine.id}` : activeRoutine.path)}
                    style={{
                      backgroundColor: "#1dd1a1",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "0.95rem",
                      marginTop: "5px",
                      transition: "all 0.2s ease",
                      boxShadow: "0 4px 10px rgba(29, 209, 161, 0.3)"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#19b088";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "#1dd1a1";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {t("continue_routine")}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
