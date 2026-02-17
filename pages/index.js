import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getWorkoutsFeed, searchUsers, likeWorkout, addWorkoutComment } from "../lib/firebase";
import { useRouter } from "next/router";

export default function Home() {
  const { user, authUser, isLoaded, following, handleFollow, handleUnfollow, isMobile, refreshData, t } = useUser();
  const [feedWorkouts, setFeedWorkouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [commentingOn, setCommentingOn] = useState(null);
  const [expandedWorkout, setExpandedWorkout] = useState(null);
  const [newComment, setNewComment] = useState("");
  const router = useRouter();

  // Forzar refresco de datos al entrar al feed
  useEffect(() => {
    if (authUser) {
      refreshData();
    }
  }, [authUser]);

  useEffect(() => {
    const fetchFeed = async () => {
      if (authUser) {
        // Feed incluye mis entrenos y los de la gente que sigo
        const userIds = [authUser.uid, ...following];
        const workouts = await getWorkoutsFeed(userIds);
        setFeedWorkouts(workouts);
      }
    };
    fetchFeed();
  }, [authUser, following]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await searchUsers(searchTerm);
    setSearchResults(results);
  };

  const handleLike = async (workoutId) => {
    if (!authUser) return;
    try {
      await likeWorkout(workoutId, authUser.uid);
      // Optimistic update
      setFeedWorkouts(prev => prev.map(w => w.id === workoutId ? {
        ...w,
        likes: w.likes?.includes(authUser.uid) ? w.likes.filter(id => id !== authUser.uid) : [...(w.likes || []), authUser.uid]
      } : w));
    } catch (error) {
      console.error("Error al dar like:", error);
      alert("Error al dar like: " + error.message);
    }
  };

  const handleAddComment = async (workoutId) => {
    if (!newComment.trim() || !authUser) return;
    const comment = {
      text: newComment,
      authorId: authUser.uid,
      authorName: user?.username || authUser.displayName || "Usuario",
      createdAt: Date.now()
    };
    try {
      await addWorkoutComment(workoutId, comment);
      setFeedWorkouts(prev => prev.map(w => w.id === workoutId ? {
        ...w,
        commentsList: [...(w.commentsList || []), comment]
      } : w));
      setNewComment("");
      setCommentingOn(null);
    } catch (error) {
      console.error("Error al comentar:", error);
      alert("Error al comentar: " + error.message);
    }
  };

  if (!isLoaded) return <Layout><div style={{ padding: "20px", color: "#fff" }}>Cargando...</div></Layout>;

  return (
    <Layout>
      <div style={{ 
        backgroundColor: "#000", 
        color: "#fff", 
        minHeight: "100vh", 
        padding: isMobile ? "0" : "20px", 
        maxWidth: isMobile ? "100%" : "600px", 
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box"
      }}>
        
        {/* Buscador de usuarios interactivo */}
        <div style={{ marginBottom: "30px", position: "relative", padding: isMobile ? "0 10px" : "0" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", color: "#666" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
              <input
                placeholder="Buscar usuarios por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "20px",
                  padding: "12px 20px 12px 45px",
                  color: "#fff",
                  outline: "none",
                  fontSize: "1rem",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#1dd1a1"}
                onBlur={(e) => e.target.style.borderColor = "#333"}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "1.2rem" }}
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Enlace a Gente recomendada si no se está buscando */}
          {!searchTerm && (
            <div 
              onClick={() => router.push("/recommended")}
              style={{ 
                marginTop: "10px", 
                backgroundColor: "#1a1a1a", 
                borderRadius: isMobile ? "0" : "12px", 
                border: isMobile ? "none" : "1px solid #333",
                borderTop: "1px solid #333",
                borderBottom: "1px solid #333",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#222"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#1a1a1a"}
            >
              <div style={{ color: "#1dd1a1", fontWeight: "bold", fontSize: "0.9rem" }}>
                Gente que podrías seguir (click aquí)
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1dd1a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          )}

          {/* Resultados de búsqueda */}
          {searchTerm && searchResults.length > 0 && (
            <div style={{ 
              marginTop: "10px", 
              backgroundColor: "#1a1a1a", 
              borderRadius: isMobile ? "0" : "15px", 
              border: isMobile ? "none" : "1px solid #333",
              borderTop: "1px solid #333",
              borderBottom: "1px solid #333",
              maxHeight: "300px", 
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              zIndex: 100,
              position: "absolute",
              left: 0,
              right: 0
            }}>
              <div style={{ padding: "10px 15px", fontSize: "0.8rem", color: "#1dd1a1", borderBottom: "1px solid #333", fontWeight: "bold" }}>
                Resultados de búsqueda
              </div>
              {searchResults.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => router.push(`/user/${u.id}`)}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    padding: "12px 15px", 
                    borderBottom: "1px solid #222",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#222"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "transparent", overflow: "hidden" }}>
                      {u.photoURL ? <img src={u.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>?</div>}
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold" }}>@{u.username}</div>
                      <div style={{ fontSize: "0.8rem", color: "#888" }}>{u.firstName}</div>
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
                        padding: "6px 14px",
                        borderRadius: "15px",
                        fontSize: "0.8rem",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      {following.includes(u.id) ? "Siguiendo" : "Seguir"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", padding: isMobile ? "0 15px" : "0" }}>
          <span style={{ width: "4px", height: "24px", backgroundColor: "#1dd1a1", borderRadius: "2px" }}></span>
          {t("feed")}
        </h1>

        {/* Feed de Entrenamientos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {feedWorkouts.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", marginTop: "40px" }}>No hay entrenamientos para mostrar. ¡Sigue a alguien para ver su actividad!</div>
          ) : (
            feedWorkouts.map(workout => (
              <div key={workout.id} style={{ backgroundColor: "#1a1a1a", padding: "15px", borderRadius: isMobile ? "0" : "12px", borderBottom: isMobile ? "1px solid #333" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#333", overflow: "hidden" }}>
                    {workout.userPhoto && <img src={workout.userPhoto} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: "bold" }}>@{workout.userName}</div>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>{new Date(workout.completedAt).toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#1dd1a1" }}>{workout.name}</div>
                  <div style={{ fontSize: "0.9rem", color: "#ccc", marginTop: "5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{workout.series} series • {workout.totalVolume?.toLocaleString()} kg • {workout.totalReps} reps</span>
                    <button 
                      onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#1dd1a1",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0
                      }}
                    >
                      {expandedWorkout === workout.id ? "Ocultar detalles" : "Ver detalles"}
                    </button>
                  </div>
                </div>

                {expandedWorkout === workout.id && workout.exerciseDetails && (
                  <div style={{ 
                    backgroundColor: "#000", 
                    borderRadius: "12px", 
                    padding: "15px", 
                    marginBottom: "15px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "25px",
                    border: "1px solid #1a1a1a"
                  }}>
                    {workout.exerciseDetails.map((ex, idx) => (
                      <div key={idx}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                          <div style={{
                            width: "35px",
                            height: "35px",
                            borderRadius: "50%",
                            backgroundColor: "#fff",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            overflow: "hidden"
                          }}>
                            <img 
                              src={`/exercises/${(ex?.name || "").toLowerCase().replace(/ /g, "_")}.png`} 
                              onError={(e) => { e.target.src = "/logo3.png"; }}
                              alt="" 
                              style={{ width: "80%", height: "auto" }} 
                            />
                          </div>
                          <div style={{ fontWeight: "500", fontSize: "1rem", color: "#1dd1a1" }}>{t(ex.name)}</div>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", padding: "5px 0", borderBottom: "1px solid #1a1a1a", color: "#666", fontSize: "0.75rem", fontWeight: "bold", textAlign: "center" }}>
                            <div>SERIE</div>
                            <div>PESO (KG)</div>
                            <div>REPS</div>
                          </div>
                          {ex.series.map((s, sIdx) => (
                            <div key={sIdx} style={{ 
                              display: "grid", 
                              gridTemplateColumns: "40px 1fr 1fr", 
                              padding: "8px 0", 
                              textAlign: "center",
                              fontSize: "0.9rem",
                              color: "#fff",
                              backgroundColor: sIdx % 2 === 0 ? "transparent" : "#0a0a0a"
                            }}>
                              <div style={{ color: "#666", fontWeight: "bold" }}>{sIdx + 1}</div>
                              <div>{s.weight || "-"}</div>
                              <div>{s.reps || "-"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {workout.comments && (
                  <div style={{ fontSize: "0.9rem", color: "#888", fontStyle: "italic", borderLeft: "2px solid #1dd1a1", paddingLeft: "10px", margin: "10px 0" }}>
                    "{workout.comments}"
                  </div>
                )}

                <div style={{ display: "flex", gap: "20px", borderTop: "1px solid #333", paddingTop: "10px", marginTop: "10px" }}>
                  <button
                    onClick={() => handleLike(workout.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: workout.likes?.includes(authUser?.uid) ? "#1dd1a1" : "#888",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={workout.likes?.includes(authUser?.uid) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    {workout.likes?.length || 0}
                  </button>
                  <button
                    onClick={() => setCommentingOn(commentingOn === workout.id ? null : workout.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#888",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    {workout.commentsList?.length || 0}
                  </button>
                </div>

                {commentingOn === workout.id && (
                  <div style={{ marginTop: "15px", paddingTop: "10px", borderTop: "1px solid #333" }}>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                      <input
                        placeholder="Escribe un comentario..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        style={{
                          flex: 1,
                          backgroundColor: "#000",
                          border: "1px solid #333",
                          borderRadius: "20px",
                          padding: "8px 15px",
                          color: "#fff",
                          outline: "none"
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(workout.id)}
                        style={{ backgroundColor: "#1dd1a1", color: "#000", border: "none", padding: "8px 15px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        Enviar
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {workout.commentsList?.map((c, i) => (
                        <div key={i} style={{ fontSize: "0.9rem" }}>
                          <span style={{ fontWeight: "bold", marginRight: "8px" }}>@{c.authorName}</span>
                          <span style={{ color: "#ccc" }}>{c.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
