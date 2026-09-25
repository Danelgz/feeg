// Única fuente de verdad para los enlaces de navegación (Sidebar + BottomNavigation + hoja "Más").
// `key` se resuelve con t(key) — deben existir en data/translations.js para es/eu.
// `short` (opcional) es la etiqueta corta para las baldosas de la hoja "Más" en móvil, donde una
// etiqueta como "Exportar/Importar datos" parte la rejilla en tres líneas.

export const NAV_ITEMS = [
  { key: "feed", href: "/", icon: "home" },
  { key: "routines", href: "/routines", icon: "dumbbell" },
  { key: "statistics", href: "/statistics", icon: "barChart" },
  { key: "exercises", href: "/exercises", icon: "list" },
  { key: "ia", href: "/ia", icon: "sparkles", short: "nav_short_ia" },
  { key: "calendar", href: "/calendar", icon: "calendar" },
  { key: "measures", href: "/measures", icon: "ruler" },
  { key: "profile", href: "/profile", icon: "user" },
  { key: "exportar_datos", href: "/export-data", icon: "download", short: "nav_short_export" },
  { key: "settings", href: "/settings", icon: "settings" },
];

// Pestañas fijas de la barra inferior en móvil. La quinta posición es siempre el botón "Más", que
// abre una hoja con todo lo que no cabe aquí. Estadísticas va en la barra (antes estaba escondida
// en el menú) porque es la razón por la que la gente vuelve a la app entre entrenos.
export const MOBILE_PRIMARY_KEYS = ["feed", "routines", "statistics", "profile"];

// Destinos que solo existen en la hoja "Más" (no son secciones de la barra lateral de escritorio).
export const MORE_EXTRA_ITEMS = [{ key: "notifications", href: "/notifications", icon: "bell", short: "nav_short_notifications" }];

/** ¿Está `pathname` dentro de la sección `href`? Inicio solo coincide consigo mismo. */
export function isNavActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
