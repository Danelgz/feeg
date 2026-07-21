import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { Avatar, EmptyState, Icon } from "../components/ui";

const TYPE_ICON = { like: "heart", comment: "message", follow: "users" };

function getTimeAgo(timestamp, t) {
  if (!timestamp) return "";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return t("time_now");
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "a";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mes";
  interval = seconds / 604800;
  if (interval > 1) return Math.floor(interval) + "sem.";
  interval = seconds / 86400;
  if (interval >= 1) return Math.floor(interval) === 1 ? t("time_yesterday") : Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return Math.floor(seconds) + "s";
}

function notificationText(n, t) {
  if (n.type === "like") return t("notification_liked_workout");
  if (n.type === "comment") return t("notification_commented_workout");
  if (n.type === "follow") return t("notification_started_following");
  return "";
}

export default function Notifications() {
  const router = useRouter();
  const { authUser, notifications, unreadNotificationsCount, markNotificationsAsRead, theme, isMobile, t } = useUser();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);

  // Igual que abrir la bandeja de notificaciones en cualquier app: al entrar aquí, todo lo que
  // estaba sin leer pasa a leído — no hace falta un botón "marcar todo como leído" aparte.
  useEffect(() => {
    if (unreadNotificationsCount === 0) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    markNotificationsAsRead(unreadIds);
    // Solo al entrar a la página, no cada vez que cambia el array de notificaciones (eso
    // volvería a marcar como leído justo lo que acabamos de marcar, en bucle).
  }, []);

  if (!authUser) {
    return (
      <Layout>
        <div style={{ padding: isMobile ? "20px" : "20px" }}>
          <EmptyState isDark={isDark} icon="bell" title="Inicia sesión para ver tus notificaciones" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: isMobile ? "16px" : "20px" }}>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "1.8rem", fontWeight: 800, color: tk.text, margin: "0 0 20px" }}>
          {t("notifications")}
        </h1>

        {notifications.length === 0 ? (
          <EmptyState isDark={isDark} icon="bell" title={t("notifications_empty")} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => router.push(`/user/${n.fromUserId}`)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "14px",
                  borderRadius: tk.radius.md,
                  backgroundColor: n.read ? "transparent" : tk.accentSoft,
                  border: `1px solid ${n.read ? tk.border : "transparent"}`,
                  cursor: "pointer",
                  transition: tk.transition,
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Avatar photoURL={n.fromUserPhoto} name={n.fromUserName} size={44} />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-2px",
                      right: "-2px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: tk.accent,
                      color: tk.onAccent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${tk.bg}`,
                    }}
                  >
                    <Icon name={TYPE_ICON[n.type] || "bell"} size={11} />
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.92rem", color: tk.text, lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700 }}>{n.fromUserName}</span> {notificationText(n, t)}
                  </div>
                  {n.type === "comment" && n.commentText && (
                    <div style={{ fontSize: "0.85rem", color: tk.textMuted, marginTop: "3px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      "{n.commentText}"
                    </div>
                  )}
                  <div style={{ fontSize: "0.75rem", color: tk.textFaint, marginTop: "4px" }}>{getTimeAgo(n.createdAt, t)}</div>
                </div>

                {!n.read && (
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: tk.accent, flexShrink: 0, marginTop: "6px" }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
