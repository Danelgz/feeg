import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { NAV_ITEMS } from "../data/navigation";
import Icon from "./ui/Icon";

export default function Sidebar() {
  const { theme, t, isMobile } = useUser();
  const router = useRouter();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);

  if (isMobile) {
    return null;
  }

  return (
    <aside
      style={{
        width: "230px",
        backgroundColor: tk.surface,
        color: tk.text,
        padding: "20px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minHeight: "100vh",
        borderRight: `1px solid ${tk.border}`,
        transition: tk.transition,
      }}
    >
      <div style={{ padding: "10px 10px 24px", textAlign: "center" }}>
        <img
          src={isDark ? "/logo.png" : "/logo2.png"}
          alt="FEEG Logo"
          style={{ width: "100px", height: "auto" }}
        />
      </div>
      {NAV_ITEMS.map((item) => {
        const isActive = router.pathname === item.href;
        return (
          <Link
            key={item.key}
            href={item.href}
            style={{
              position: "relative",
              color: isActive ? tk.accent : tk.text,
              textDecoration: "none",
              padding: "11px 14px",
              borderRadius: tk.radius.sm,
              transition: tk.transition,
              backgroundColor: isActive ? tk.accentSoft : "transparent",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontWeight: isActive ? 700 : 500,
              fontSize: "0.92rem",
            }}
            onMouseOver={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = tk.surfaceHover;
                e.currentTarget.style.color = tk.accent;
              }
            }}
            onMouseOut={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = tk.text;
              }
            }}
          >
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "20%",
                  bottom: "20%",
                  width: "3px",
                  borderRadius: "0 3px 3px 0",
                  backgroundColor: tk.accent,
                }}
              />
            )}
            <Icon name={item.icon} size={19} />
            <span>{t(item.key)}</span>
          </Link>
        );
      })}
    </aside>
  );
}
