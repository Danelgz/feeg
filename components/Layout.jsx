import Sidebar from "./Sidebar";
import BottomNavigation from "./BottomNavigation";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getTokens } from "../lib/tokens";
import { Icon, Button, LoadingOverlay, ConfirmModal } from "./ui";
import { readLiveElapsedFromSnapshot } from "../lib/workoutStorage";
import { useMinDurationLoading } from "../hooks/useMinDurationLoading";

export default function Layout({ children, hideBottomNav = false }) {
  const { theme, isMobile, activeRoutine, endRoutine, notification, isSyncing, isInitialSync, t, authUser, unreadNotificationsCount } = useUser();
  // El overlay a pantalla completa se reserva para la carga en frío: sincronizando SIN nada local
  // que mostrar (ver isInitialSync en context/UserContext.js). Antes se mostraba para cualquier
  // isSyncing, y como cada pestaña llama a refreshData() al montar, cambiar de apartado tapaba la
  // app entera aunque los datos ya estuvieran en pantalla — y con minVisibleMs de 3s una
  // sincronización de 350ms se convertía en 3 segundos de bloqueo.
  const showLoadingOverlay = useMinDurationLoading(isInitialSync, { showDelayMs: 300, minVisibleMs: 900 });
  // Revalidación en segundo plano (datos locales ya visibles): no bloquea nada, solo una barra fina
  // arriba. Al no tapar contenido no necesita el margen anti-parpadeo largo del overlay.
  const showSyncBar = useMinDurationLoading(isSyncing && !isInitialSync, { showDelayMs: 500, minVisibleMs: 600 });
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
      // Fuente de la app (Outfit, ver pages/_app.js). El fallback mantiene la pila del sistema por si
      // la variable no llega a resolverse.
      fontFamily: "var(--font-feeg), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      backgroundColor: isDark ? "#0f0f0f" : "#f0f2f5",
      color: isDark ? "#fff" : "#333",
      transition: "background-color 0.3s ease",
    }}>
      <Head>
        <title>FEEG · Registra tus entrenos</title>
        <link rel="icon" href="/logo3.png" />
        <link rel="apple-touch-icon" href="/logo3.png" />
        <link rel="shortcut icon" href="/logo3.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        {/* Sin esto, compartir un enlace de FEEG en WhatsApp o Twitter no muestra nada: ni título, ni
            descripción, ni imagen. */}
        <meta
          name="description"
          content="Registra tus entrenamientos, crea rutinas y sigue tu progreso con estadísticas, récords personales y mapa muscular. Gratis."
        />
        <meta property="og:title" content="FEEG · Registra tus entrenos" />
        <meta
          property="og:description"
          content="Rutinas, récords personales, volumen por músculo y progreso real. Gratis."
        />
        <meta property="og:image" content="/logo3.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        {/* Tiñe la barra del navegador en móvil del color del fondo, para que la app no quede
            enmarcada por una franja blanca. */}
        <meta name="theme-color" content={isDark ? "#0f0f0f" : "#f0f2f5"} />
        <style>{`
          html, body {
            margin: 0;
            padding: 0;
            background-color: ${isDark ? "#0f0f0f" : "#f0f2f5"};
            transition: background-color 0.3s ease;
            height: 100%;
            width: 100%;
            font-family: var(--font-feeg), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            /* Los saltos con ancla dejan de teletransportar la vista. */
            scroll-behavior: smooth;
          }
          * {
            font-family: inherit;
          }
          /* Cifras de ancho fijo en toda la app: sin esto los contadores en vivo (cronómetro de
             serie, volumen, tiempo transcurrido) cambian de ancho a cada tick y el texto de al lado
             se mueve. En una app de datos se nota constantemente. */
          html {
            font-variant-numeric: tabular-nums;
          }
          /* Titulares con presencia: tracking negativo a tamaño grande, que es lo que separa un
             título tipografiado de un texto simplemente puesto en grande. */
          h1, h2, h3 {
            letter-spacing: -0.02em;
            text-wrap: balance;
          }
          p {
            text-wrap: pretty;
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
          /* Indicador de sincronización de fondo: por encima de la barra superior (z-index 500)
             pero sin capturar clics ni desplazar el layout. */
          .sync-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            z-index: 900;
            overflow: hidden;
            pointer-events: none;
            animation: fadeInPage 0.25s ease both;
          }
          .sync-bar::after {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            width: 38%;
            background: linear-gradient(90deg, transparent 0%, ${tk.accent} 50%, transparent 100%);
            animation: syncBarSweep 1.15s ease-in-out infinite;
            will-change: transform;
          }
          @keyframes syncBarSweep {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(270%); }
          }
          @media (prefers-reduced-motion: reduce) {
            .sync-bar::after {
              animation: none;
              width: 100%;
              opacity: 0.5;
            }
          }
        `}</style>
      </Head>

      {isMounted && (
        <>
          {/* Pantalla de Carga (solo carga en frío) / Sincronización de fondo */}
          {showLoadingOverlay && <LoadingOverlay label="Cargando" sublabel="Un momento, por favor" />}
          {showSyncBar && <div className="sync-bar" aria-hidden="true" />}

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
                      padding: currentIsMobile ? "12px 14px" : "14px 20px",
                      // Cristal translúcido en vez de un rectángulo sólido: el contenido de la
                      // página se intuye debajo, y los botones (con su propio fondo opaco+sombra)
                      // son lo único que de verdad "pesa" visualmente en la barra.
                      background: isDark
                        ? "linear-gradient(180deg, rgba(15,15,15,0.85) 0%, rgba(15,15,15,0.6) 100%)"
                        : "linear-gradient(180deg, rgba(240,242,245,0.9) 0%, rgba(240,242,245,0.65) 100%)",
                      backdropFilter: "blur(14px)",
                      WebkitBackdropFilter: "blur(14px)",
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
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
                          backgroundColor: tk.surface,
                          border: `1.5px solid ${tk.accent}`,
                          color: tk.accent,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          transition: tk.transition,
                          boxShadow: tk.shadow.card,
                          flexShrink: 0,
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = tk.accent;
                          e.currentTarget.style.color = tk.onAccent;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = tk.surface;
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
                          backgroundColor: tk.surface,
                          border: `1.5px solid ${unreadNotificationsCount > 0 ? tk.accent : tk.border}`,
                          color: unreadNotificationsCount > 0 ? tk.accent : tk.text,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          transition: tk.transition,
                          boxShadow: tk.shadow.card,
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
                              boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
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
