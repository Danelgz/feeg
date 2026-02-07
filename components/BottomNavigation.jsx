import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";

export default function BottomNavigation() {
  const { theme, t } = useUser();
  const router = useRouter();
  const isDark = theme === 'dark';

  const navItems = [
    { name: t("feed"), href: "/", icon: "🏠" },
    { name: t("routines"), href: "/routines", icon: "🏋️" },
    { name: t("profile"), href: "/profile", icon: "👤" }
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
    </nav>
  );
}
