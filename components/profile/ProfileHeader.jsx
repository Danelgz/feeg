import { getTokens } from "../../lib/tokens";

/**
 * Cabecera de perfil: username, nombre, foto, contadores y descripción. La esquina superior
 * derecha cambia según de quién es el perfil: editar+ajustes en el tuyo (onEdit/onOpenSettings),
 * o un botón seguir/siguiendo en el de otra persona (isFollowing/onToggleFollow) — mismo layout,
 * misma estética, la parte que cambia es solo la acción disponible.
 */
export default function ProfileHeader({
  isDark,
  user,
  workoutsCount,
  followersCount,
  followingCount,
  onEdit,
  onOpenSettings,
  isFollowing,
  onToggleFollow,
  onOpenPhoto,
  onOpenFollowers,
  onOpenFollowing,
}) {
  const tk = getTokens(isDark);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px", gap: "12px" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: "800", margin: 0, letterSpacing: "-0.5px", color: tk.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user?.username || "Usuario"}
        </h1>
        {onToggleFollow ? (
          <button
            onClick={onToggleFollow}
            style={{
              flexShrink: 0,
              padding: "9px 20px",
              borderRadius: "10px",
              border: isFollowing ? `1px solid ${tk.border}` : "none",
              backgroundColor: isFollowing ? "transparent" : tk.accent,
              color: isFollowing ? tk.text : tk.onAccent,
              fontWeight: "700",
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: tk.transition,
            }}
          >
            {isFollowing ? "Siguiendo" : "Seguir"}
          </button>
        ) : (
          <div style={{ display: "flex", gap: "18px", flexShrink: 0 }}>
            <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: tk.text, padding: "5px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button onClick={onOpenSettings} style={{ background: "none", border: "none", cursor: "pointer", color: tk.text, padding: "5px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0 1.51-1V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </div>
        )}
      </div>

      <div style={{ fontSize: "1rem", color: tk.accent, fontWeight: "600", marginBottom: "20px" }}>
        {user?.firstName || "Sin nombre"}
      </div>

      <div style={{ display: "flex", gap: "25px", alignItems: "center", marginBottom: "25px" }}>
        <div
          onClick={onOpenPhoto}
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            backgroundColor: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "2rem" }}>👤</span>
          )}
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "space-between", textAlign: "center" }}>
          <div style={{ cursor: "pointer" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: "800", color: tk.text }}>{workoutsCount || 0}</div>
            <div style={{ color: tk.textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Entrenos</div>
          </div>
          <div onClick={onOpenFollowers} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: "800", color: tk.text }}>{followersCount || 0}</div>
            <div style={{ color: tk.textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Seguidores</div>
          </div>
          <div onClick={onOpenFollowing} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: "800", color: tk.text }}>{followingCount || 0}</div>
            <div style={{ color: tk.textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Siguiendo</div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginBottom: "30px",
          fontSize: "0.95rem",
          color: tk.textMuted,
          lineHeight: "1.5",
          backgroundColor: tk.surfaceAlt,
          padding: "12px 15px",
          borderRadius: "12px",
          borderLeft: `3px solid ${tk.accent}`,
        }}
      >
        {user?.description || "Sin descripción"}
      </div>
    </>
  );
}
