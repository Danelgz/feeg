import { useState } from "react";
import { useRouter } from "next/router";
import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";

const MENU_ITEMS = [
  { label: "Estadísticas", path: "/statistics", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg> },
  { label: "Ejercicios", path: "/exercises", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18h12"></path><path d="M6 6h12"></path><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="12" r="3"></circle></svg> },
  { label: "Medidas", path: "/measures", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg> },
  { label: "Calendario", path: "/calendar", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> },
];

/**
 * Botón desplegable con accesos rápidos a estadísticas/ejercicios/medidas/calendario — autocontenido.
 *
 * Las entradas son filas de una lista dentro de UN único panel (icono + etiqueta + chevron,
 * separadas por una línea fina), no una rejilla de tarjetas con su propio borde cada una — eso se
 * leía como cuatro cuadros sueltos en vez de un menú.
 *
 * extraItems añade entradas más allá de las fijas de arriba (misma fila, mismo estilo) sin que
 * este componente tenga que conocerlas de antemano — p. ej. "Cuerpo de rangos" en pages/profile.js,
 * que abre un modal en vez de navegar. Cada entrada admite `path` (navega) u `onClick` (acción
 * directa); si trae las dos, `onClick` gana.
 */
export default function ProfileInfoMenu({ isDark = true, extraItems = [] }) {
  const tk = getTokens(isDark);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = [...MENU_ITEMS, ...extraItems];

  return (
    <div style={{ marginBottom: "30px" }}>
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&display=swap");`}</style>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          backgroundColor: tk.surfaceAlt,
          color: tk.text,
          border: `1px solid ${open ? tk.accent : tk.border}`,
          borderRadius: "15px",
          fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
          fontSize: "1.05rem",
          fontWeight: "700",
          cursor: "pointer",
          transition: "all 0.3s ease",
          boxShadow: open ? tk.shadow.accent : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: tk.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: tk.accent,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </div>
          Información
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={tk.accent}
          strokeWidth="3"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease" }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {open && (
        <div
          style={{
            marginTop: "10px",
            border: `1px solid ${tk.border}`,
            borderRadius: "15px",
            overflow: "hidden",
            animation: "fadeIn 0.3s ease",
          }}
        >
          {items.map((btn, index) => (
            <button
              key={btn.label}
              onClick={() => {
                setOpen(false);
                if (btn.onClick) btn.onClick();
                else router.push(btn.path);
              }}
              className="feeg-press feeg-hover"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                backgroundColor: "transparent",
                color: tk.text,
                border: "none",
                borderBottom: index < items.length - 1 ? `1px solid ${tk.border}` : "none",
                fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
                fontSize: "0.9rem",
                fontWeight: "700",
                cursor: "pointer",
                textAlign: "left",
                "--feeg-hover-bg": tk.surfaceAlt,
                "--feeg-press-scale": 0.98,
              }}
            >
              <span style={{ color: tk.accent, display: "flex", flexShrink: 0 }}>{btn.icon}</span>
              <span style={{ flex: 1 }}>{btn.label}</span>
              <Icon name="chevronRight" size={16} color={tk.textFaint} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
