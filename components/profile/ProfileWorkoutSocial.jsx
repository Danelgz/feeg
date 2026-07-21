import { useRef, useState } from "react";
import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";

const EMOJI_LIST = ["💪", "🔥", "👏", "🏋️", "👊", "🤤", "🏆"];

function getTimeAgo(timestamp) {
  if (!timestamp) return "";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "a";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mes";
  interval = seconds / 604800;
  if (interval > 1) return Math.floor(interval) + "sem.";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return Math.floor(seconds) + "s";
}

/**
 * Like + comentarios de un entreno ajeno (perfil público) — mismo bloque que ya existía en el
 * feed principal y en la versión anterior del perfil público, ahora reutilizable. Opcional a
 * propósito: el perfil propio no lo monta (no tiene sentido darte like a ti mismo).
 */
export default function ProfileWorkoutSocial({ isDark = true, liked, likesCount, comments, onToggleLike, onAddComment, t }) {
  const tk = getTokens(isDark);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const inputRef = useRef(null);

  const handleSend = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
  };

  const handleReplyTo = (authorName) => {
    setNewComment(`@${authorName} `);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ display: "flex", gap: "20px", borderTop: `1px solid ${tk.border}`, paddingTop: "10px" }}>
        <button
          onClick={onToggleLike}
          style={{
            background: "none",
            border: "none",
            color: liked ? tk.accent : tk.textMuted,
            display: "flex",
            alignItems: "center",
            gap: "5px",
            cursor: "pointer",
            fontSize: "0.9rem",
            padding: 0,
          }}
        >
          <Icon name="heart" size={19} style={{ fill: liked ? "currentColor" : "none" }} />
          {likesCount || 0}
        </button>
        <button
          onClick={() => setCommentsOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: commentsOpen ? tk.accent : tk.textMuted,
            display: "flex",
            alignItems: "center",
            gap: "5px",
            cursor: "pointer",
            fontSize: "0.9rem",
            padding: 0,
          }}
        >
          <Icon name="message" size={19} />
          {comments?.length || 0}
        </button>
      </div>

      {commentsOpen && (
        <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: `1px solid ${tk.border}`, display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: tk.textMuted }}>{t("comments_label")}</span>
            <span style={{ fontSize: "0.78rem", color: tk.accent, cursor: "pointer" }} onClick={() => setCommentsOpen(false)}>
              {t("close")}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {!comments || comments.length === 0 ? (
              <div style={{ fontSize: "0.85rem", color: tk.textMuted, textAlign: "center", padding: "8px" }}>No hay comentarios aún.</div>
            ) : (
              comments.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: tk.surfaceHover, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.authorPhoto ? <img src={c.authorPhoto} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="user" size={13} color={tk.textFaint} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "bold", fontSize: "0.85rem", color: tk.text }}>{c.authorName}</span>
                      <span style={{ color: tk.textFaint, fontSize: "0.72rem" }}>{getTimeAgo(c.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: "0.9rem", color: tk.text, lineHeight: "1.4" }}>{c.text}</div>
                    <div onClick={() => handleReplyTo(c.authorName)} style={{ marginTop: "4px", fontSize: "0.75rem", color: tk.textMuted, fontWeight: "bold", cursor: "pointer" }}>
                      {t("reply")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", padding: "0 6px" }}>
              {EMOJI_LIST.map((emoji) => (
                <span key={emoji} onClick={() => setNewComment((prev) => prev + emoji)} style={{ fontSize: "1.3rem", cursor: "pointer" }}>
                  {emoji}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: tk.surfaceAlt, borderRadius: "999px", padding: "5px 5px 5px 14px", border: `1px solid ${tk.border}` }}>
              <input
                ref={inputRef}
                placeholder={t("add_comment_placeholder")}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                style={{ flex: 1, backgroundColor: "transparent", border: "none", color: tk.text, outline: "none", fontSize: "0.9rem", padding: "7px 0" }}
              />
              <button
                onClick={handleSend}
                disabled={!newComment.trim()}
                style={{
                  backgroundColor: tk.accent,
                  color: tk.onAccent,
                  border: "none",
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  opacity: newComment.trim() ? 1 : 0.5,
                  transition: "opacity 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <Icon name="arrowRight" size={15} style={{ transform: "rotate(-90deg)" }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
