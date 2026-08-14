import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useState, useEffect } from "react";
import { getTokens } from "../lib/tokens";
import { NAV_ITEMS, MOBILE_PRIMARY_KEYS } from "../data/navigation";
import Icon from "./ui/Icon";

export default function BottomNavigation() {
  const { theme, t } = useUser();
  const router = useRouter();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    document.body.style.overflow = showMenu ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showMenu]);

  const primaryItems = MOBILE_PRIMARY_KEYS.map((key) => NAV_ITEMS.find((n) => n.key === key)).filter(Boolean);

  // Es el elemento más pulsado de la app en móvil, así que es el que más nota el feedback de
  // pulsación (.feeg-press). Escala más que una tarjeta porque es una superficie pequeña.
  const itemStyle = (active) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "3px",
    textDecoration: "none",
    color: active ? tk.accent : tk.textFaint,
    transition: tk.transition,
    padding: "6px 14px",
    borderRadius: tk.radius.sm,
    minWidth: "60px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    "--feeg-press-scale": 0.9,
  });

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: tk.surface,
        borderTop: `1px solid ${tk.border}`,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "8px 0",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
        zIndex: 1000,
        boxShadow: tk.shadow.float,
      }}
    >
      {primaryItems.map((item) => {
        const isActive = router.pathname === item.href;
        return (
          <Link key={item.key} href={item.href} className="feeg-press" style={itemStyle(isActive)}>
            <Icon name={item.icon} size={22} />
            <span style={{ fontSize: "0.7rem", fontWeight: isActive ? 700 : 500 }}>{t(item.key)}</span>
          </Link>
        );
      })}

      <button onClick={() => setShowMenu(!showMenu)} className="feeg-press" style={itemStyle(showMenu)}>
        <Icon name={showMenu ? "close" : "menu"} size={22} />
        <span style={{ fontSize: "0.7rem", fontWeight: showMenu ? 700 : 500 }}>{t("menu")}</span>
      </button>

      {showMenu && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark ? "rgba(0, 0, 0, 0.98)" : "rgba(255, 255, 255, 0.98)",
            zIndex: 999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px",
            backdropFilter: "blur(6px)",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setShowMenu(false)}
            className="feeg-press"
            aria-label={t("close") || "Cerrar"}
            style={{
              position: "sticky",
              top: "20px",
              width: "40px",
              height: "40px",
              backgroundColor: tk.accent,
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              color: tk.onAccent,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1001,
              transition: tk.transition,
              boxShadow: tk.shadow.accent,
              alignSelf: "flex-end",
              marginBottom: "10px",
            }}
          >
            <Icon name="close" size={20} />
          </button>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "400px" }}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <img
                src={isDark ? "/logo.png" : "/logo2.png"}
                alt="FEEG Logo"
                style={{ width: "90px", height: "auto", marginBottom: "12px" }}
              />
              <h2 style={{ color: tk.text, fontSize: "1.4rem", fontWeight: 700, margin: 0, letterSpacing: "0.5px" }}>
                {t("menu")}
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                width: "100%",
                maxHeight: "calc(100vh - 240px)",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {NAV_ITEMS.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className="feeg-surface feeg-press feeg-hover"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: tk.space.lg,
                      padding: "15px 18px",
                      textDecoration: "none",
                      borderRadius: tk.radius.md,
                      fontWeight: tk.weight.medium,
                      fontSize: "0.98rem",
                      "--feeg-bg": isActive ? tk.accentSoft : tk.surfaceAlt,
                      "--feeg-fg": isActive ? tk.accent : tk.text,
                      "--feeg-border": isActive ? tk.accent : tk.border,
                      "--feeg-border-width": "1.5px",
                      "--feeg-hover-border": tk.accent,
                      "--feeg-press-scale": 0.975,
                    }}
                  >
                    <Icon name={item.icon} size={20} />
                    {t(item.key)}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
