import Sidebar from "./Sidebar";
import BottomNavigation from "./BottomNavigation";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getTokens } from "../lib/tokens";
import { Icon, Button, Spinner, ConfirmModal } from "./ui";
import { readLiveElapsedFromSnapshot } from "../lib/workoutStorage";

export default function Layout({ children, hideBottomNav = false }) {
  const { theme, isMobile, activeRoutine, endRoutine, notification, isSyncing, t, authUser, unreadNotificationsCount } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const [isMounted, setIsMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [isIntroExiting, setIsIntroExiting] = useState(false);
  const [confirmEndRoutine, setConfirmEndRoutine] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState(null);
  const router = useRouter();

  // Usar useEffect para evitar problemas de SSR con sessionStorage
  useEffect(() => {
    setIsMounted(true);
    const introPlayed = sessionStorage.getItem("introPlayed");
    if (isMobile && !introPlayed) {
      setShowIntro(true);
    }
  }, [isMobile]);

  // Lee el snapshot persistido por el motor de sesión de entrenamiento (hooks/useWorkoutSession,
  // solo lectura, no se modifica su estado) para mostrar el tiempo transcurrido en vivo en la
  // pestaña flotante de rutina activa.
  useEffect(() => {
    if (!activeRoutine) {
      setLiveElapsed(null);
      return;
    }
    const readTimer = () => setLiveElapsed(readLiveElapsedFromSnapshot());
    readTimer();
    const interval = setInterval(readTimer, 1000);
    return () => clearInterval(interval);
  }, [activeRoutine]);

  const formatElapsed = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const topLevelPages = ["/", "/routines", "/exercises", "/statistics", "/profile", "/settings", "/routines/create", "/routines/[id]", "/routines/empty", "/user/[uid]", "/exercise-history"];
  const isTopLevel = topLevelPages.includes(router.pathname) || topLevelPages.includes(router.asPath);

  // Las tres pantallas de "modo entreno" reducen el chrome a propósito (ver getWorkoutTokens en
  // lib/tokens.js) — la campana de notificaciones no pinta ahí, igual que el botón de atrás.
  const workoutModePages = ["/routines/create", "/routines/[id]", "/routines/empty"];
  const isWorkoutMode = workoutModePages.includes(router.pathname);

  const showBack = !isTopLevel && !isWorkoutMode;
  const showBell = !!authUser && !isWorkoutMode;

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
    } catch (_) { }

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
            }
            100% {
              opacity: 1;
            }
          }
          .page-transition {
            animation: fadeInPage 0.3s ease both;
            will-change: opacity;
          }
        `}</style>
      </Head>

      {isMounted && (
        <>
          {/* Pantalla de Carga / Sincronización */}
          {isSyncing && (
            <div style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 15000,
              gap: "20px",
              animation: "syncFadeIn 0.3s ease"
            }}>
              <style>{`
                @keyframes syncFadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes syncPulse {
                  0%, 100% { opacity: 0.6; }
                  50% { opacity: 1; }
                }
              `}</style>
              <Spinner isDark={true} size={56} />
              <div style={{ textAlign: "center" }}>
                <div style={{
                  color: "#fff",
                  fontSize: "1.05rem",
                  fontWeight: "600",
                  letterSpacing: "0.01em",
                  animation: "syncPulse 1.8s ease-in-out infinite"
                }}>
                  Sincronizando tus datos…
                </div>
                <div style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: "0.8rem",
                  marginTop: "6px"
                }}>
                  Un momento, por favor
                </div>
              </div>
            </div>
          )}

          {notification && (
            <div style={{
              position: "fixed",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 11000,
              backgroundColor: notification.type === 'error' ? tk.danger : tk.accent,
              color: notification.type === 'error' ? "#fff" : tk.onAccent,
              padding: "12px 24px",
              borderRadius: tk.radius.md,
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              minWidth: "280px",
              maxWidth: "90vw",
              animation: "slideDown 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
              fontWeight: "bold",
              textAlign: "center",
              justifyContent: "center"
            }}>
              <style>{`
                @keyframes slideDown {
                  from { opacity: 0; transform: translate(-50%, -40px); }
                  to { opacity: 1; transform: translate(-50%, 0); }
                }
              `}</style>
              <Icon name={notification.type === 'error' ? "alertCircle" : "check"} size={18} />
              <span>{notification.message}</span>
            </div>
          )}

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

              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                {/* Barra superior: atrás + notificaciones EN el flujo del documento, no flotando
                    encima del contenido — así nunca pueden taparlo, a diferencia de los dos
                    botones fijos independientes que había antes (que sí lo hacían en páginas sin
                    hueco reservado arriba, sobre todo en móvil). Solo se renderiza si hay algo
                    que mostrar, para no dejar una tira vacía en páginas top-level sin sesión. */}
                {!isWorkoutMode && (showBack || showBell) && (
                  <header
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: currentIsMobile ? "10px 14px" : "12px 20px",
                      backgroundColor: tk.surface,
                      borderBottom: `1px solid ${tk.border}`,
                      flexShrink: 0,
                    }}
                  >
                    {showBack ? (
                      <button
                        onClick={smartBack}
                        title="Atrás"
                        aria-label="Atrás"
                        style={{
                          width: currentIsMobile ? "34px" : "38px",
                          height: currentIsMobile ? "34px" : "38px",
                          borderRadius: tk.radius.full,
                          backgroundColor: "transparent",
                          border: `1.5px solid ${tk.accent}`,
                          color: tk.accent,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          transition: tk.transition,
                          flexShrink: 0,
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = tk.accent;
                          e.currentTarget.style.color = tk.onAccent;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = tk.accent;
                        }}
                      >
                        <Icon name="chevronLeft" size={currentIsMobile ? 18 : 20} />
                      </button>
                    ) : (
                      <span />
                    )}

                    {showBell && (
                      <button
                        onClick={() => router.push("/notifications")}
                        title={t("notifications")}
                        aria-label={t("notifications")}
                        style={{
                          position: "relative",
                          width: currentIsMobile ? "34px" : "38px",
                          height: currentIsMobile ? "34px" : "38px",
                          borderRadius: tk.radius.full,
                          backgroundColor: "transparent",
                          border: `1.5px solid ${tk.border}`,
                          color: tk.text,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          transition: tk.transition,
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="bell" size={currentIsMobile ? 16 : 18} />
                        {unreadNotificationsCount > 0 && (
                          <span
                            style={{
                              position: "absolute",
                              top: "-4px",
                              right: "-4px",
                              minWidth: "17px",
                              height: "17px",
                              padding: "0 4px",
                              borderRadius: tk.radius.full,
                              backgroundColor: tk.danger,
                              color: "#fff",
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: `2px solid ${tk.surface}`,
                            }}
                          >
                            {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                          </span>
                        )}
                      </button>
                    )}
                  </header>
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
              </div>

              {/* Navegación Inferior para Móvil */}
              {currentIsMobile && !hideBottomNav && <BottomNavigation />}

              {/* Pestaña de Rutina Activa */}
              {activeRoutine && router.asPath !== (activeRoutine?.id ? `/routines/${activeRoutine.id}` : activeRoutine.path) && !router.pathname.startsWith('/exercise-history') && (
                <div style={{
                  position: "fixed",
                  bottom: currentIsMobile ? "80px" : "20px",
                  right: "20px",
                  backgroundColor: tk.surface,
                  border: `2px solid ${tk.accent}`,
                  borderRadius: tk.radius.md,
                  padding: "15px",
                  boxShadow: tk.shadow.float,
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
                        color: tk.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        {t("active_routine_in_progress")}
                        {liveElapsed !== null && (
                          <span style={{ color: tk.accent, fontVariantNumeric: "tabular-nums" }}>
                            · {formatElapsed(liveElapsed)}
                          </span>
                        )}
                      </span>
                      <span style={{
                        fontWeight: "bold",
                        color: tk.text,
                        fontSize: "1.1rem",
                        marginTop: "2px"
                      }}>
                        {activeRoutine.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmEndRoutine(true); }}
                      title={t("delete_routine_short")}
                      style={{
                        background: tk.surfaceHover,
                        border: "none",
                        color: tk.danger,
                        cursor: "pointer",
                        width: "24px",
                        height: "24px",
                        borderRadius: tk.radius.full,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: tk.transition
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                      onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                  <Button isDark={isDark} fullWidth onClick={() => router.push(activeRoutine?.id ? `/routines/${activeRoutine.id}` : activeRoutine.path)}>
                    {t("continue_routine")}
                  </Button>
                </div>
              )}

              <ConfirmModal
                isDark={isDark}
                open={confirmEndRoutine}
                title={t("delete_routine_confirmation")}
                confirmLabel={t("yes_finish") || "Sí"}
                cancelLabel={t("no_continue") || "No"}
                danger
                onConfirm={() => { setConfirmEndRoutine(false); endRoutine(); }}
                onCancel={() => setConfirmEndRoutine(false)}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
