// Única fuente de verdad para los enlaces de navegación (Sidebar + BottomNavigation).
// `key` se resuelve con t(key) — deben existir en data/translations.js para es/eu.

export const NAV_ITEMS = [
  { key: "feed", href: "/", icon: "home" },
  { key: "routines", href: "/routines", icon: "dumbbell" },
  { key: "exercises", href: "/exercises", icon: "list" },
  { key: "ia", href: "/ia", icon: "zap" },
  { key: "food", href: "/food", icon: "utensils" },
  { key: "statistics", href: "/statistics", icon: "barChart" },
  { key: "profile", href: "/profile", icon: "user" },
  { key: "exportar_datos", href: "/export-data", icon: "download" },
  { key: "settings", href: "/settings", icon: "settings" },
];

// Subconjunto priorizado para la barra inferior en móvil (máx. 3 + botón de menú).
export const MOBILE_PRIMARY_KEYS = ["feed", "routines", "profile"];
