import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { NAV_ITEMS, MOBILE_PRIMARY_KEYS, isNavActive } from "../data/navigation";
import Icon from "./ui/Icon";
import MoreSheet from "./MoreSheet";
import { tapFeedback } from "../lib/haptics";

/** Alto de la barra sin el safe-area. Layout reserva este hueco al final de cada página. */
export const BOTTOM_NAV_HEIGHT = 62;

/**
 * Barra de pestañas de móvil: cuatro secciones + "Más".
 *
 * - Cristal translúcido pegado abajo (no una píldora flotante): en móvil cada píxel vertical cuenta,
 *   y una barra flotante con márgenes ocupa lo mismo y enseña menos contenido detrás.
 * - La pestaña activa se "enciende": icono relleno + una cápsula de acento que se desliza entre
 *   pestañas (layoutId), así el cambio de sección se lee como un movimiento y no como un salto.
 * - Las secciones que no caben (Ejercicios, Coach IA, Calendario, Medidas…) viven en la hoja "Más",
 *   que se abre desde abajo en vez de tapar la pantalla entera como el menú anterior.
 */
export default function BottomNavigation() {
  const { theme, t, unreadNotificationsCount } = useUser();
  const router = useRouter();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const [showMore, setShowMore] = useState(false);

  // Cerrar la hoja al navegar (incluido el gesto "atrás" del sistema).
  useEffect(() => {
    const close = () => setShowMore(false);
    router.events?.on("routeChangeStart", close);
    return () => router.events?.off("routeChangeStart", close);
  }, [router.events]);

  const primaryItems = MOBILE_PRIMARY_KEYS.map((key) => NAV_ITEMS.find((n) => n.key === key)).filter(
    (item): item is (typeof NAV_ITEMS)[number] => Boolean(item)
  );
  const primaryActive = primaryItems.some((item) => isNavActive(router.pathname, item.href));
  // "Más" se marca activo si la página actual es una de las suyas (Ajustes, Calendario...), para
  // que la barra nunca se quede sin ninguna pestaña encendida.
  const moreActive = showMore || (!primaryActive && router.pathname !== "/user/[uid]");

  const renderTab = (key: string, label: string, icon: string, active: boolean, badge = 0) => (
    <>
      <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 30 }}>
        {active && (
          <motion.span
            layoutId="feeg-tab-pill"
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              backgroundColor: tk.accentSoft,
              boxShadow: `inset 0 0 0 1px ${isDark ? "rgba(29,209,161,0.18)" : "rgba(29,209,161,0.25)"}`,
            }}
          />
        )}
        <motion.span
          key={`${key}-${active}`}
          initial={active && !reduceMotion ? { scale: 0.7 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 22 }}
          style={{ position: "relative", display: "flex" }}
        >
          <Icon name={icon} size={22} strokeWidth={1.9} filled={active} />
        </motion.span>
        {badge > 0 && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 8,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              boxSizing: "border-box",
              borderRadius: 999,
              backgroundColor: tk.danger,
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              lineHeight: "16px",
              textAlign: "center",
              boxShadow: `0 0 0 2px ${tk.bg}`,
            }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span
        style={{
          fontSize: "0.66rem",
          fontWeight: active ? 700 : 500,
          letterSpacing: "0.01em",
          lineHeight: 1,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </>
  );

  const tabStyle = (active: boolean) =>
    ({
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      height: BOTTOM_NAV_HEIGHT,
      textDecoration: "none",
      color: active ? tk.accent : tk.textMuted,
      background: "transparent",
      border: "none",
      padding: 0,
      cursor: "pointer",
      transition: `color ${tk.motion.css.fast}`,
      "--feeg-press-scale": 0.88,
    }) as React.CSSProperties;

  return (
    <>
      <nav
        aria-label={t("menu")}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "stretch",
          padding: "0 6px",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: isDark ? "rgba(10, 10, 10, 0.78)" : "rgba(255, 255, 255, 0.82)",
          backdropFilter: "saturate(180%) blur(22px)",
          WebkitBackdropFilter: "saturate(180%) blur(22px)",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
        }}
      >
        {primaryItems.map((item) => {
          const active = !showMore && isNavActive(router.pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className="feeg-press"
              aria-current={active ? "page" : undefined}
              onClick={() => tapFeedback()}
              style={tabStyle(active)}
            >
              {renderTab(item.key, t(item.key), item.icon, active)}
            </Link>
          );
        })}

        <button
          type="button"
          className="feeg-press"
          aria-expanded={showMore}
          aria-haspopup="dialog"
          onClick={() => {
            tapFeedback();
            setShowMore((v) => !v);
          }}
          style={tabStyle(moreActive)}
        >
          {renderTab("more", t("more_title"), "grid", moreActive, unreadNotificationsCount)}
        </button>
      </nav>

      <MoreSheet open={showMore} onClose={() => setShowMore(false)} />
    </>
  );
}
