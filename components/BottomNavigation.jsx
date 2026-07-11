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
          <Link key={item.key} href={item.href} style={itemStyle(isActive)}>
            <Icon name={item.icon} size={22} />
            <span style={{ fontSize: "0.7rem", fontWeight: isActive ? 700 : 500 }}>{t(item.key)}</span>
          </Link>
        );
      })}

      <button onClick={() => setShowMenu(!showMenu)} style={itemStyle(showMenu)}>
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
            backgroundColor: isDark ? "rgba(15, 15, 15, 0.98)" : "rgba(255, 255, 255, 0.98)",
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "15px 18px",
                      backgroundColor: isActive ? tk.accentSoft : tk.surfaceAlt,
                      color: isActive ? tk.accent : tk.text,
                      textDecoration: "none",
                      borderRadius: tk.radius.md,
                      border: `1.5px solid ${isActive ? tk.accent : tk.border}`,
                      fontWeight: 600,
                      fontSize: "0.98rem",
                      transition: tk.transition,
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
