import { useState } from "react";
import { getTokens } from "../../lib/tokens";
import { getRankPosition } from "../../data/ranks";
import { Icon, RankArt } from "../ui";

/**
 * Cabecera de perfil, igual para el propio y el ajeno; lo que cambia son las acciones:
 * editar/compartir/ajustes en el tuyo (onEdit/onOpenSettings), seguir/compartir en el de otra
 * persona (isFollowing/onToggleFollow).
 *
 * - Avatar grande con un aro del color del rango y la insignia encima: el rango es parte de la
 *   identidad del perfil, no una entrada escondida en un menú.
 * - Nombre como titular y @usuario debajo (antes era al revés, con el nombre en verde).
 * - Cifras en una fila con separadores finos, pulsables las de seguidores/siguiendo.
 * - La bio es texto normal, sin caja con borde lateral.
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
  rankLevel = null,
  prestigeLevels = 0,
  onOpenRank,
  onShare,
}) {
  const tk = getTokens(isDark);
  const [followPulse, setFollowPulse] = useState(false);
  const position = rankLevel != null ? getRankPosition(rankLevel, prestigeLevels) : null;
  const ringColor = position ? position.rank.color : tk.accent;
  const displayName = user?.firstName || user?.username || "Usuario";
  const initials = displayName.trim().slice(0, 1).toUpperCase();

  const handleToggleFollow = () => {
    onToggleFollow();
    setFollowPulse(true);
    window.setTimeout(() => setFollowPulse(false), 450);
  };

  const stats = [
    { key: "workouts", label: "Entrenos", value: workoutsCount || 0 },
    { key: "followers", label: "Seguidores", value: followersCount || 0, onClick: onOpenFollowers },
    { key: "following", label: "Siguiendo", value: followingCount || 0, onClick: onOpenFollowing },
  ];

  const secondaryButton = {
    flex: 1,
    height: 40,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "none",
    borderRadius: 12,
    background: tk.hairline,
    color: tk.text,
    fontWeight: 700,
    fontSize: "0.88rem",
    cursor: "pointer",
  };

  return (
    <header style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          type="button"
          onClick={onOpenPhoto}
          aria-label="Ver foto de perfil"
          style={{ position: "relative", flexShrink: 0, width: 92, height: 92, padding: 3, border: "none", borderRadius: "50%", cursor: "pointer", background: `conic-gradient(from 210deg, ${ringColor}, ${ringColor}55, ${ringColor})` }}
        >
          <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", padding: 3, background: tk.bg, boxSizing: "border-box" }}>
            <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: tk.surface, color: tk.text, fontSize: "2rem", fontWeight: 800 }}>
              {user?.photoURL ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
            </span>
          </span>
          {position && (
            <span style={{ position: "absolute", right: -4, bottom: -4, padding: 2, borderRadius: "50%", background: tk.bg }}>
              <RankArt rank={position.rank} tier={position.tier} size={34} />
            </span>
          )}
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, letterSpacing: "-0.02em", color: tk.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </h1>
          <div style={{ fontSize: "0.86rem", color: tk.textMuted, fontWeight: 600, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            @{user?.username || "usuario"}
          </div>
          {position && (
            <button
              type="button"
              onClick={onOpenRank}
              disabled={!onOpenRank}
              className="feeg-press"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 10px 4px 8px", border: "none", borderRadius: 99, background: `${position.rank.color}1f`, color: position.rank.color, fontWeight: 800, fontSize: "0.76rem", cursor: onOpenRank ? "pointer" : "default" }}
            >
              <Icon name="award" size={13} /> {position.label}
              {onOpenRank && <Icon name="chevronRight" size={12} />}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 18, borderTop: `1px solid ${tk.hairline}`, borderBottom: `1px solid ${tk.hairline}` }}>
        {stats.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={s.onClick}
            disabled={!s.onClick}
            style={{ padding: "11px 0", border: "none", borderLeft: i ? `1px solid ${tk.hairline}` : "none", background: "none", cursor: s.onClick ? "pointer" : "default", textAlign: "center" }}
          >
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: tk.text, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{Number(s.value).toLocaleString("es-ES")}</div>
            <div style={{ fontSize: "0.72rem", color: tk.textMuted, fontWeight: 600, marginTop: 1 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {user?.description && user.description !== "Sin descripción" && (
        <p style={{ margin: "14px 0 0", fontSize: "0.92rem", color: tk.text, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{user.description}</p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {onToggleFollow ? (
          <button
            type="button"
            onClick={handleToggleFollow}
            className={`feeg-press${followPulse ? " feeg-check-pulse" : ""}`}
            style={{ ...secondaryButton, background: isFollowing ? tk.hairline : tk.accent, color: isFollowing ? tk.text : tk.onAccent, "--feeg-pulse-color": tk.accent }}
          >
            <Icon name={isFollowing ? "check" : "plus"} size={15} />
            {isFollowing ? "Siguiendo" : "Seguir"}
          </button>
        ) : (
          onEdit && (
            <button type="button" onClick={onEdit} className="feeg-press" style={secondaryButton}>
              <Icon name="edit" size={15} /> Editar perfil
            </button>
          )
        )}
        {onShare && (
          <button type="button" onClick={onShare} className="feeg-press" style={secondaryButton}>
            <Icon name="share" size={15} /> Compartir
          </button>
        )}
        {onOpenSettings && (
          <button type="button" onClick={onOpenSettings} aria-label="Ajustes" className="feeg-press" style={{ ...secondaryButton, flex: "0 0 40px" }}>
            <Icon name="settings" size={17} />
          </button>
        )}
      </div>
    </header>
  );
}
