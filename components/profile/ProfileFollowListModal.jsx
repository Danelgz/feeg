import { useRouter } from "next/router";
import { getTokens } from "../../lib/tokens";

/** Lista de seguidores / seguidos, compartida entre ambos botones de contador del header. */
export default function ProfileFollowListModal({ isDark = true, open, title, users, onClose }) {
  const tk = getTokens(isDark);
  const router = useRouter();

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(4, 8, 8, 0.72)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 4000, padding: "20px",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap");`}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: tk.surface,
          border: `1px solid ${tk.border}`,
          padding: "22px",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "400px",
          maxHeight: "80vh",
          overflowY: "auto",
          fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h2 style={{ color: tk.text, margin: 0, fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="feeg-press feeg-hover"
            style={{
              width: "32px",
              height: "32px",
              display: "grid",
              placeItems: "center",
              border: `1px solid ${tk.border}`,
              borderRadius: "10px",
              background: "transparent",
              color: tk.textMuted,
              fontSize: "1.2rem",
              cursor: "pointer",
              "--feeg-hover-bg": tk.surfaceHover,
              "--feeg-hover-fg": tk.text,
              "--feeg-press-scale": 0.9,
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {users.length === 0 ? (
            <p style={{ color: tk.textFaint, textAlign: "center", fontSize: "0.9rem" }}>No hay nadie aquí todavía.</p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                onClick={() => {
                  router.push(`/user/${u.id}`);
                  onClose();
                }}
                className="feeg-press feeg-hover"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                  padding: "9px 8px",
                  borderRadius: "12px",
                  "--feeg-hover-bg": tk.surfaceHover,
                  "--feeg-press-scale": 0.98,
                }}
              >
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: tk.surfaceAlt, overflow: "hidden", flexShrink: 0 }}>
                  {u.photoURL && <img src={u.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: tk.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    @{u.username}
                  </div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 500, color: tk.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.firstName}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
