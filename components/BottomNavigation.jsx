import Link from "next/link";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";

export default function BottomNavigation() {
  const { theme, t, isMenuOpen, setIsMenuOpen } = useUser();
  const router = useRouter();
  const isDark = theme === 'dark';

  const topLevelPages = ["/", "/routines", "/exercises", "/statistics", "/profile", "/settings", "/statistics/[view]", "/routines/create", "/routines/[id]", "/routines/empty", "/user/[uid]", "/exercise-history"];
  const isTopLevel = topLevelPages.includes(router.pathname) || topLevelPages.includes(router.asPath);

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
          <polyline points="15 18 9 12 15 6"></polyline>
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
              onClick={smartBack}
              disabled={isTopLevel}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textDecoration: "none",
                color: isTopLevel ? (isDark ? "#444" : "#ccc") : (isDark ? "#999" : "#666"),
                transition: "all 0.2s ease",
                padding: "5px 10px",
                borderRadius: "8px",
                minWidth: "60px",
                border: "none",
                background: "transparent",
                cursor: isTopLevel ? "default" : "pointer",
                opacity: isTopLevel ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (!isTopLevel) {
                  e.currentTarget.style.color = "#1dd1a1";
                  e.currentTarget.style.backgroundColor = isDark ? "#2a2a2a" : "#f5f5f5";
                }
              }}
              onMouseOut={(e) => {
                if (!isTopLevel) {
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
                fontWeight: "normal",
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
    </nav>
  );
}
