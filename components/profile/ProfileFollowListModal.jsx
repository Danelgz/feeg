import { useRouter } from "next/router";

/** Lista de seguidores / seguidos, compartida entre ambos botones de contador del header. */
export default function ProfileFollowListModal({ open, title, users, onClose }) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 4000, padding: "20px",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1a1a1a", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ color: "#fff", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {users.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center" }}>No hay nadie aquí todavía.</p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                onClick={() => {
                  router.push(`/user/${u.id}`);
                  onClose();
                }}
                style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "8px", borderRadius: "8px", transition: "background 0.2s" }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#2a2a2a")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "transparent", overflow: "hidden" }}>
                  {u.photoURL && <img src={u.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div>
                  <div style={{ fontWeight: "bold", color: "#fff" }}>@{u.username}</div>
                  <div style={{ fontSize: "0.8rem", color: "#888" }}>{u.firstName}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
