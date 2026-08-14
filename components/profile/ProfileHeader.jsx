import { useState } from "react";
import { getTokens } from "../../lib/tokens";
import { RankBadge } from "../ui";

/**
 * Cabecera de perfil: username, nombre, foto, contadores y descripción. La esquina superior
 * derecha cambia según de quién es el perfil: editar+ajustes en el tuyo (onEdit/onOpenSettings),
 * o un botón seguir/siguiendo en el de otra persona (isFollowing/onToggleFollow) — mismo layout,
 * misma estética, la parte que cambia es solo la acción disponible.
 *
 * overallLevel/prestigeLevels vienen de fuentes distintas según de quién es el perfil: en el
 * propio se calculan en vivo con useRanks() (tienes tus propias medidas), en el ajeno se leen ya
 * calculados de usersPublic/{uid} (sus medidas son privadas) — ver pages/profile.js y
 * pages/user/[uid].js. Aquí simplemente se pintan si llegan; si no hay datos suficientes para
 * calcular rango, ambas páginas pasan undefined y la insignia no se muestra.
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
  overallLevel,
  prestigeLevels,
  hasRoutines,
  onViewRoutines,
}) {
  const tk = getTokens(isDark);
  const [followPulse, setFollowPulse] = useState(false);

  const handleToggleFollow = () => {
    onToggleFollow();
    setFollowPulse(true);
    window.setTimeout(() => setFollowPulse(false), 450);
  };

  const statDividerStyle = { width: "1px", alignSelf: "stretch", backgroundColor: tk.border };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px", gap: "12px" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: "800", margin: 0, letterSpacing: "-0.5px", color: tk.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user?.username || "Usuario"}
        </h1>
        {onToggleFollow ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {hasRoutines && (
              <button
                onClick={onViewRoutines}
                className="feeg-press feeg-hover"
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: `1px solid ${tk.border}`,
                  backgroundColor: "transparent",
                  color: tk.text,
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  "--feeg-hover-bg": tk.surfaceHover,
                  "--feeg-press-scale": 0.95,
                }}
              >
                Rutinas
              </button>
            )}
            <button
              onClick={handleToggleFollow}
              className={`feeg-press${followPulse ? " feeg-check-pulse" : ""}`}
              style={{
                position: "relative",
                padding: "9px 20px",
                borderRadius: "10px",
                border: isFollowing ? `1px solid ${tk.border}` : "none",
                backgroundColor: isFollowing ? "transparent" : tk.accent,
                color: isFollowing ? tk.text : tk.onAccent,
                fontWeight: "700",
                fontSize: "0.9rem",
                cursor: "pointer",
                "--feeg-press-scale": 0.93,
                "--feeg-pulse-color": tk.accent,
              }}
            >
              {isFollowing ? "Siguiendo" : "Seguir"}
            </button>
          </div>
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

      <div style={{ fontSize: "1rem", color: tk.accent, fontWeight: "600", marginBottom: "16px" }}>
        {user?.firstName || "Sin nombre"}
      </div>

      {typeof overallLevel === "number" && (
        <div style={{ marginBottom: "16px" }}>
          <RankBadge isDark={isDark} level={overallLevel} prestigeLevels={prestigeLevels || 0} size="sm" />
        </div>
      )}

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

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "center" }}>
          <div style={{ flex: 1, cursor: "pointer" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: "800", color: tk.text }}>{workoutsCount || 0}</div>
            <div style={{ color: tk.textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Entrenos</div>
          </div>
          <div style={statDividerStyle} />
          <div onClick={onOpenFollowers} style={{ flex: 1, cursor: "pointer" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: "800", color: tk.text }}>{followersCount || 0}</div>
            <div style={{ color: tk.textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Seguidores</div>
          </div>
          <div style={statDividerStyle} />
          <div onClick={onOpenFollowing} style={{ flex: 1, cursor: "pointer" }}>
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
