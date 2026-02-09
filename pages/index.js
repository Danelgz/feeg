import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getWorkoutsFeed, searchUsers, likeWorkout, addWorkoutComment } from "../lib/firebase";
import { useRouter } from "next/router";

export default function Home() {
  const { user, authUser, isLoaded, following, handleFollow, handleUnfollow } = useUser();
  const [feedWorkouts, setFeedWorkouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [commentingOn, setCommentingOn] = useState(null);
  const [newComment, setNewComment] = useState("");
  const router = useRouter();

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
    const loadInitialUsers = async () => {
      if (isLoaded && !searchTerm.trim()) {
        const results = await searchUsers("");
        setSearchResults(results);
      }
    };
    loadInitialUsers();
  }, [isLoaded]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    const results = await searchUsers(searchTerm);
    setSearchResults(results);
  };

  const handleLike = async (workoutId) => {
    if (!authUser) return;
    await likeWorkout(workoutId, authUser.uid);
    // Optimistic update or refetch
    setFeedWorkouts(prev => prev.map(w => w.id === workoutId ? {
      ...w,
      likes: w.likes?.includes(authUser.uid) ? w.likes.filter(id => id !== authUser.uid) : [...(w.likes || []), authUser.uid]
    } : w));
  };

  const handleAddComment = async (workoutId) => {
    if (!newComment.trim() || !authUser) return;
    const comment = {
      text: newComment,
      authorId: authUser.uid,
      authorName: user?.username || authUser.displayName || "Usuario",
      createdAt: Date.now()
    };
    await addWorkoutComment(workoutId, comment);
    setFeedWorkouts(prev => prev.map(w => w.id === workoutId ? {
      ...w,
      commentsList: [...(w.commentsList || []), comment]
    } : w));
    setNewComment("");
    setCommentingOn(null);
  };

  if (!isLoaded) return <Layout><div style={{ padding: "20px", color: "#fff" }}>Cargando...</div></Layout>;

  return (
    <Layout>
      <div style={{ backgroundColor: "#000", color: "#fff", minHeight: "100vh", padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        
        {/* Buscador de usuarios interactivo */}
        <div style={{ marginBottom: "30px", position: "relative" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "20px",
                  padding: "12px 20px",
                  color: "#fff",
                  outline: "none",
                  fontSize: "1rem"
                }}
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

          {searchResults.length > 0 && (searchTerm || searchResults.length > 0) && (
            <div style={{ 
              marginTop: "10px", 
              backgroundColor: "#1a1a1a", 
              borderRadius: "15px", 
              border: "1px solid #333",
              maxHeight: "300px", 
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              zIndex: 100,
              position: searchTerm ? "absolute" : "relative",
              left: 0,
              right: 0
            }}>
              <div style={{ padding: "10px 15px", fontSize: "0.8rem", color: "#1dd1a1", borderBottom: "1px solid #333", fontWeight: "bold" }}>
                {searchTerm ? "Resultados de búsqueda" : "Gente que podrías seguir"}
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
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#333", overflow: "hidden" }}>
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

        <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "4px", height: "24px", backgroundColor: "#1dd1a1", borderRadius: "2px" }}></span>
          Actividad
        </h1>

        {/* Feed de Entrenamientos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {feedWorkouts.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", marginTop: "40px" }}>No hay entrenamientos para mostrar. ¡Sigue a alguien para ver su actividad!</div>
          ) : (
            feedWorkouts.map(workout => (
              <div key={workout.id} style={{ backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "12px" }}>
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
                  <div style={{ fontSize: "0.9rem", color: "#ccc", marginTop: "5px" }}>
                    {workout.series} series • {workout.totalVolume?.toLocaleString()} kg • {workout.totalReps} reps
                  </div>
                </div>

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
