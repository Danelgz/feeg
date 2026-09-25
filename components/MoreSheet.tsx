import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { NAV_ITEMS, MOBILE_PRIMARY_KEYS, MORE_EXTRA_ITEMS, isNavActive } from "../data/navigation";
import { tapFeedback } from "../lib/haptics";
import Icon from "./ui/Icon";

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
}

// Cada destino lleva su propio tinte para que la rejilla se lea de un vistazo por color además de
// por icono. Son variaciones del mismo registro (saturación media, sobre fondo oscuro), no una paleta
// nueva: el acento de marca sigue siendo el único color "fuerte" de la hoja.
const TILE_TINT: Record<string, string> = {
  exercises: "#1dd1a1",
  ia: "#a78bfa",
  calendar: "#60a5fa",
  measures: "#f59e0b",
  notifications: "#f472b6",
  exportar_datos: "#34d399",
  settings: "#94a3b8",
};

/**
 * Hoja inferior con todo lo que no cabe en la barra de pestañas.
 *
 * Sustituye al menú a pantalla completa anterior (una lista vertical de ocho filas con el logo
 * encima): la hoja deja ver la página debajo, se cierra arrastrando hacia abajo como cualquier hoja
 * nativa, y la rejilla de baldosas llega a cualquier destino con el pulgar sin desplazarse.
 */
export default function MoreSheet({ open, onClose }: MoreSheetProps) {
  const { theme, t, unreadNotificationsCount, activeRoutine, endRoutine, themePreference, setThemeMode } = useUser();
  const router = useRouter();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const items = [...NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_KEYS.includes(item.key)), ...MORE_EXTRA_ITEMS];
  // Notificaciones justo después de lo más usado, no al final: es la única baldosa con contador.
  const order = ["exercises", "ia", "calendar", "measures", "notifications", "exportar_datos", "settings"];
  items.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  const activeRoutinePath = activeRoutine ? (activeRoutine.id ? `/routines/${activeRoutine.id}` : activeRoutine.path) : null;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 600) onClose();
  };

  const startEmpty = () => {
    tapFeedback();
    onClose();
    endRoutine();
    router.push("/routines/empty");
  };

  const toggleTheme = () => {
    tapFeedback();
    setThemeMode(isDark ? "light" : "dark");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="more-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 998,
              backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(15,20,30,0.28)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />
          <motion.div
            key="more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("more_title")}
            initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
            drag={reduceMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              maxHeight: "86vh",
              overflowY: "auto",
              boxSizing: "border-box",
              padding: "8px 16px",
              paddingBottom: "calc(78px + env(safe-area-inset-bottom))",
              borderRadius: "28px 28px 0 0",
              background: isDark ? "rgba(22, 22, 22, 0.96)" : "rgba(255, 255, 255, 0.97)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
              boxShadow: "0 -20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <div aria-hidden style={{ width: 38, height: 5, borderRadius: 99, background: tk.borderStrong, margin: "2px auto 14px" }} />

            {/* Acción principal: continuar el entreno en curso o empezar uno vacío en un toque. */}
            {activeRoutinePath ? (
              <Link
                href={activeRoutinePath}
                onClick={() => tapFeedback()}
                className="feeg-press"
                style={primaryActionStyle(tk)}
              >
                <span style={primaryIconStyle(tk)}>
                  <Icon name="play" size={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: "0.72rem", opacity: 0.7, fontWeight: 600 }}>{t("active_routine_in_progress")}</span>
                  <span style={{ display: "block", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeRoutine?.name || t("continue_routine")}
                  </span>
                </span>
                <Icon name="chevronRight" size={18} />
              </Link>
            ) : (
              <button type="button" onClick={startEmpty} className="feeg-press" style={primaryActionStyle(tk)}>
                <span style={primaryIconStyle(tk)}>
                  <Icon name="play" size={18} />
                </span>
                <span style={{ flex: 1, textAlign: "left", fontWeight: 800 }}>{t("start_empty_workout")}</span>
                <Icon name="chevronRight" size={18} />
              </button>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
              {items.map((item, i) => {
                const active = isNavActive(router.pathname, item.href);
                const tint = TILE_TINT[item.key] || tk.accent;
                const badge = item.key === "notifications" ? unreadNotificationsCount : 0;
                const label = t(("short" in item && item.short) || item.key);
                return (
                  <motion.div
                    key={item.key}
                    initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.05 + i * 0.03, type: "spring", stiffness: 500, damping: 32 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => tapFeedback()}
                      className="feeg-press"
                      aria-current={active ? "page" : undefined}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 7,
                        padding: "12px 4px 10px",
                        borderRadius: 18,
                        textDecoration: "none",
                        color: tk.text,
                        background: active ? tk.accentSoft : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                        border: `1px solid ${active ? tk.accent : "transparent"}`,
                        "--feeg-press-scale": 0.92,
                      } as React.CSSProperties}
                    >
                      <span
                        style={{
                          position: "relative",
                          width: 42,
                          height: 42,
                          borderRadius: 14,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: tint,
                          background: `linear-gradient(145deg, ${tint}33, ${tint}14)`,
                          boxShadow: `inset 0 0 0 1px ${tint}2e`,
                        }}
                      >
                        <Icon name={item.icon} size={21} strokeWidth={1.9} />
                        {badge > 0 && (
                          <span
                            style={{
                              position: "absolute",
                              top: -5,
                              right: -5,
                              minWidth: 18,
                              height: 18,
                              padding: "0 5px",
                              boxSizing: "border-box",
                              borderRadius: 99,
                              background: tk.danger,
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 800,
                              lineHeight: "18px",
                              textAlign: "center",
                            }}
                          >
                            {badge > 9 ? "9+" : badge}
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          textAlign: "center",
                          lineHeight: 1.15,
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              role="switch"
              aria-checked={isDark}
              className="feeg-press"
              style={{
                marginTop: 14,
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 16,
                border: `1px solid ${tk.border}`,
                background: "transparent",
                color: tk.text,
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 600,
                "--feeg-press-scale": 0.98,
              } as React.CSSProperties}
            >
              <Icon name={isDark ? "moon" : "sun"} size={18} color={tk.accent} />
              <span style={{ flex: 1, textAlign: "left" }}>{t("dark_mode")}</span>
              {themePreference === "system" && <span style={{ fontSize: "0.72rem", color: tk.textMuted }}>{t("theme_system_short")}</span>}
              {/* Interruptor dibujado (no un <button> anidado dentro de otro). */}
              <span
                aria-hidden
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 99,
                  padding: 3,
                  boxSizing: "border-box",
                  display: "flex",
                  justifyContent: isDark ? "flex-end" : "flex-start",
                  background: isDark ? tk.accent : tk.surfaceHover,
                  transition: `background-color ${tk.motion.css.base}`,
                }}
              >
                <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 34 }} style={{ width: 20, height: 20, borderRadius: 99, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function primaryActionStyle(tk: ReturnType<typeof getTokens>): React.CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 18,
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    color: tk.onAccent,
    fontSize: "0.98rem",
    background: `linear-gradient(135deg, ${tk.accent} 0%, #12b38a 100%)`,
    boxShadow: tk.shadow.accent,
    boxSizing: "border-box",
    ["--feeg-press-scale" as string]: 0.97,
  };
}

function primaryIconStyle(tk: ReturnType<typeof getTokens>): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.14)",
    color: tk.onAccent,
    flexShrink: 0,
  };
}
