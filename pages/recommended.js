import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { searchUsers } from "../lib/firebase";
import { useRouter } from "next/router";
import { getTokens } from "../lib/tokens";
import { Icon, Button, Spinner, EmptyState } from "../components/ui";

export default function Recommended() {
  const { authUser, isLoaded, following, handleFollow, handleUnfollow, isMobile, theme } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUsers = async () => {
      if (isLoaded) {
        setLoadingUsers(true);
        const results = await searchUsers("");
        setUsers(results);
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, [isLoaded]);

  if (!isLoaded) return <Layout><Spinner isDark={isDark} fullPage label="Cargando..." /></Layout>;

  return (
    <Layout>
      <div style={{
        maxWidth: isMobile ? "100%" : "600px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box"
      }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0 0 24px", color: tk.text }}>Gente recomendada</h1>

        <div style={{ backgroundColor: tk.surface, borderRadius: tk.radius.lg, border: `1px solid ${tk.border}`, overflow: "hidden" }}>
          {loadingUsers ? (
            <Spinner isDark={isDark} fullPage />
          ) : users.length === 0 ? (
            <EmptyState isDark={isDark} icon="users" title="No hay recomendaciones en este momento" description="Vuelve más tarde para descubrir gente nueva a la que seguir." />
          ) : (
            users.map(u => (
              <div
                key={u.id}
                onClick={() => router.push(`/user/${u.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "15px",
                  borderBottom: `1px solid ${tk.border}`,
                  cursor: "pointer",
                  transition: tk.transition
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = tk.surfaceHover}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "45px", height: "45px", borderRadius: tk.radius.full, backgroundColor: tk.surfaceHover, overflow: "hidden" }}>
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: tk.textMuted }}>
                        <Icon name="user" size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: "bold", color: tk.text }}>@{u.username}</div>
                    <div style={{ fontSize: "0.85rem", color: tk.textMuted }}>{u.firstName}</div>
                  </div>
                </div>
                {u.id !== authUser?.uid && (
                  <Button
                    isDark={isDark}
                    size="sm"
                    variant={following.includes(u.id) ? "secondary" : "primary"}
                    onClick={(e) => {
                      e.stopPropagation();
                      following.includes(u.id) ? handleUnfollow(u.id) : handleFollow(u.id);
                    }}
                  >
                    {following.includes(u.id) ? "Siguiendo" : "Seguir"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
