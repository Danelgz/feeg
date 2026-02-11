import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { searchUsers } from "../lib/firebase";
import { useRouter } from "next/router";

export default function Recommended() {
  const { authUser, isLoaded, following, handleFollow, handleUnfollow } = useUser();
  const [users, setUsers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const loadUsers = async () => {
      if (isLoaded) {
        // Obtenemos una lista inicial de usuarios
        const results = await searchUsers("");
        setUsers(results);
      }
    };
    loadUsers();
  }, [isLoaded]);

  if (!isLoaded) return <Layout><div style={{ padding: "20px", color: "#fff" }}>Cargando...</div></Layout>;

  return (
    <Layout>
      <div style={{ backgroundColor: "#000", color: "#fff", minHeight: "100vh", padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" }}>
          <button 
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: "5px", display: "flex", alignItems: "center" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>Gente recomendada</h1>
        </div>

        <div style={{ backgroundColor: "#1a1a1a", borderRadius: "15px", border: "1px solid #333", overflow: "hidden" }}>
          {users.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>No hay recomendaciones en este momento.</div>
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
                  borderBottom: "1px solid #222",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#222"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "45px", height: "45px", borderRadius: "50%", backgroundColor: "#333", overflow: "hidden" }}>
                    {u.photoURL ? <img src={u.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>?</div>}
                  </div>
                  <div>
                    <div style={{ fontWeight: "bold" }}>@{u.username}</div>
                    <div style={{ fontSize: "0.85rem", color: "#888" }}>{u.firstName}</div>
                  </div>
                </div>
                {u.id !== authUser?.uid && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      following.includes(u.id) ? handleUnfollow(u.id) : handleFollow(u.id);
                    }}
                    style={{
                      backgroundColor: following.includes(u.id) ? "transparent" : "#1dd1a1",
                      color: following.includes(u.id) ? "#fff" : "#000",
                      border: following.includes(u.id) ? "1px solid #444" : "none",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    {following.includes(u.id) ? "Siguiendo" : "Seguir"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
