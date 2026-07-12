import { useState } from "react";
import { useRouter } from "next/router";

const MENU_ITEMS = [
  { label: "Estadísticas", path: "/statistics", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg> },
  { label: "Ejercicios", path: "/exercises", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18h12"></path><path d="M6 6h12"></path><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="12" r="3"></circle></svg> },
  { label: "Medidas", path: "/measures", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg> },
  { label: "Calendario", path: "/calendar", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> },
];

/** Botón desplegable con accesos rápidos a estadísticas/ejercicios/medidas/calendario — autocontenido. */
export default function ProfileInfoMenu() {
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
          backgroundColor: "#111",
          color: "#fff",
          border: `1px solid ${open ? "#1dd1a1" : "#333"}`,
          borderRadius: "15px",
          fontSize: "1.1rem",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.3s ease",
          boxShadow: open ? "0 4px 15px rgba(29, 209, 161, 0.15)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "rgba(29, 209, 161, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1dd1a1",
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
          stroke="#1dd1a1"
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
                backgroundColor: "#1a1a1a",
                color: "#fff",
                border: "1px solid #333",
                borderRadius: "15px",
                fontSize: "0.9rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#222";
                e.currentTarget.style.borderColor = "#1dd1a1";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#1a1a1a";
                e.currentTarget.style.borderColor = "#333";
              }}
            >
              <div style={{ color: "#1dd1a1" }}>{btn.icon}</div>
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
