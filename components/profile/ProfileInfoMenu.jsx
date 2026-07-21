import { useState } from "react";
import { useRouter } from "next/router";
import { getTokens } from "../../lib/tokens";

const MENU_ITEMS = [
  { label: "Estadísticas", path: "/statistics", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg> },
  { label: "Ejercicios", path: "/exercises", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18h12"></path><path d="M6 6h12"></path><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="12" r="3"></circle></svg> },
  { label: "Medidas", path: "/measures", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg> },
  { label: "Calendario", path: "/calendar", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> },
];

/** Botón desplegable con accesos rápidos a estadísticas/ejercicios/medidas/calendario — autocontenido. */
export default function ProfileInfoMenu({ isDark = true }) {
  const tk = getTokens(isDark);
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: "30px" }}>
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
          fontSize: "1.1rem",
          fontWeight: "600",
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px", animation: "fadeIn 0.3s ease" }}>
          {MENU_ITEMS.map((btn) => (
            <button
              key={btn.label}
              onClick={() => router.push(btn.path)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "20px 10px",
                backgroundColor: tk.surfaceAlt,
                color: tk.text,
                border: `1px solid ${tk.border}`,
                borderRadius: "15px",
                fontSize: "0.9rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = tk.surfaceHover;
                e.currentTarget.style.borderColor = tk.accent;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = tk.surfaceAlt;
                e.currentTarget.style.borderColor = tk.border;
              }}
            >
              <div style={{ color: tk.accent }}>{btn.icon}</div>
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
