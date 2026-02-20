import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import MuscleGroupChart from "../components/MuscleGroupChart";
import { useUser } from "../context/UserContext";
import { getWorkoutsFeed, searchUsers, likeWorkout, addWorkoutComment } from "../lib/firebase";
import { getMuscleGroupsForWorkout } from "../lib/muscleGroupHelper";
import { useRouter } from "next/router";

export default function Home() {
  const { user, authUser, isLoaded, following, handleFollow, handleUnfollow, isMobile, refreshData, t, theme, completedWorkouts, showNotification } = useUser();
  const [feedWorkouts, setFeedWorkouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [commentingOn, setCommentingOn] = useState(null);
  const [expandedWorkout, setExpandedWorkout] = useState(null);
  const [newComment, setNewComment] = useState("");
  const router = useRouter();

  const isDark = theme === 'dark';

  const getTimeAgo = (timestamp) => {
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
  };

  const emojiList = ["💪", "🔥", "👏", "🏋️", "👊", "🤤", "🏆"];

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
      showNotification("Error al dar like: " + error.message, 'error');
    }
  };

  const handleAddComment = async (workoutId) => {
    if (!newComment.trim() || !authUser) return;
    const comment = {
      text: newComment,
      authorId: authUser.uid,
      authorName: user?.username || authUser.displayName || "Usuario",
      authorPhoto: user?.photoURL || authUser.photoURL || null,
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
      showNotification("Error al comentar: " + error.message, 'error');
    }
  };

  if (!isLoaded) return <Layout><div style={{ padding: "20px", color: isDark ? "#fff" : "#333" }}>Cargando...</div></Layout>;

  return (
    <Layout>
      <div style={{ 
        backgroundColor: isDark ? "#000" : "#f0f2f5", 
        color: isDark ? "#fff" : "#333", 
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
                placeholder={t("search_users")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                  border: isDark ? "1px solid #333" : "1px solid #ddd",
                  borderRadius: "20px",
                  padding: "12px 20px 12px 45px",
                  color: isDark ? "#fff" : "#333",
                  outline: "none",
                  fontSize: "1rem",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#1dd1a1"}
                onBlur={(e) => e.target.style.borderColor = isDark ? "#333" : "#ddd"}
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
                backgroundColor: isDark ? "#1a1a1a" : "#fff", 
                borderRadius: isMobile ? "0" : "12px", 
                border: isMobile ? "none" : (isDark ? "1px solid #333" : "1px solid #ddd"),
                borderTop: isDark ? "1px solid #333" : "1px solid #ddd",
                borderBottom: isDark ? "1px solid #333" : "1px solid #ddd",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? "#222" : "#f9f9f9"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = isDark ? "#1a1a1a" : "#fff"}
            >
              <div style={{ color: "#1dd1a1", fontWeight: "bold", fontSize: "0.9rem" }}>
                {t("people_you_might_follow")}
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
              backgroundColor: isDark ? "#1a1a1a" : "#fff", 
              borderRadius: isMobile ? "0" : "15px", 
              border: isMobile ? "none" : (isDark ? "1px solid #333" : "1px solid #ddd"),
              borderTop: isDark ? "1px solid #333" : "1px solid #ddd",
              borderBottom: isDark ? "1px solid #333" : "1px solid #ddd",
              maxHeight: "300px", 
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              zIndex: 100,
              position: "absolute",
              left: 0,
              right: 0
            }}>
              <div style={{ padding: "10px 15px", fontSize: "0.8rem", color: "#1dd1a1", borderBottom: isDark ? "1px solid #333" : "1px solid #eee", fontWeight: "bold" }}>
                {t("search_results")}
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
                    borderBottom: isDark ? "1px solid #222" : "1px solid #eee",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? "#222" : "#f9f9f9"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#eee", overflow: "hidden" }}>
                      {u.photoURL ? <img src={u.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>?</div>}
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", color: isDark ? "#fff" : "#333" }}>@{u.username}</div>
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
                        color: following.includes(u.id) ? (isDark ? "#fff" : "#333") : "#000",
                        border: following.includes(u.id) ? "1px solid #444" : "none",
                        padding: "6px 14px",
                        borderRadius: "15px",
                        fontSize: "0.8rem",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      {following.includes(u.id) ? t("following_btn") : t("follow_btn")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {authUser && completedWorkouts && completedWorkouts.length > 0 && (
          <div style={{ marginBottom: "30px", padding: isMobile ? "0 10px" : "0" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px", color: isDark ? "#fff" : "#333" }}>
              <span style={{ width: "3px", height: "20px", backgroundColor: "#1dd1a1", borderRadius: "2px" }}></span>
              Mi Último Entrenamiento
            </h2>

            {(() => {
              const lastWorkout = completedWorkouts[0];
              const musclePercentages = lastWorkout ? getMuscleGroupsForWorkout(lastWorkout) : {};
              const totalExercises = lastWorkout?.exerciseDetails?.length || 0;
              const totalTime = lastWorkout?.totalTime || Math.floor((lastWorkout?.elapsedTime || 0) / 60);

              return (
                <div style={{
                  backgroundColor: isDark ? "#1a1a1a" : "#fff",
                  borderRadius: isMobile ? "0" : "12px",
                  padding: "20px",
                  border: isDark ? "1px solid #333" : "1px solid #eee",
                  marginBottom: "20px"
                }}>
                  <div style={{ marginBottom: "15px" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#1dd1a1", marginBottom: "5px" }}>
                      {lastWorkout?.name}
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: isDark ? "#aaa" : "#666", margin: "0" }}>
                      {new Date(lastWorkout?.completedAt).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
                    gap: "10px",
                    marginBottom: "15px",
                    paddingBottom: "15px",
                    borderBottom: isDark ? "1px solid #333" : "1px solid #eee"
                  }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1dd1a1" }}>{totalExercises}</div>
                      <div style={{ fontSize: "0.75rem", color: isDark ? "#888" : "#999", marginTop: "3px" }}>Ejercicios</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#FF6B6B" }}>{lastWorkout?.series}</div>
                      <div style={{ fontSize: "0.75rem", color: isDark ? "#888" : "#999", marginTop: "3px" }}>Series</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#45B7D1" }}>{totalTime}m</div>
                      <div style={{ fontSize: "0.75rem", color: isDark ? "#888" : "#999", marginTop: "3px" }}>Duración</div>
                    </div>
                  </div>

                  <MuscleGroupChart percentages={musclePercentages} isDark={isDark} />
                </div>
              );
            })()}
          </div>
        )}

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
                <div 
                  onClick={() => workout.userId && router.push(`/user/${workout.userId}`)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", cursor: "pointer" }}
                >
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
                    <span>{workout.series} series • {workout.totalVolume?.toLocaleString()} kg • {workout.totalReps} reps • {workout.totalTime || Math.floor((workout.elapsedTime || 0) / 60)} min</span>
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
                  <div style={{ fontSize: "0.9rem", color: isDark ? "#888" : "#666", fontStyle: "italic", borderLeft: "2px solid #1dd1a1", paddingLeft: "10px", margin: "10px 0" }}>
                    "{workout.comments}"
                  </div>
                )}

                <div style={{ display: "flex", gap: "20px", borderTop: isDark ? "1px solid #333" : "1px solid #eee", paddingTop: "10px", marginTop: "10px" }}>
                  <button
                    onClick={() => handleLike(workout.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: workout.likes?.includes(authUser?.uid) ? "#1dd1a1" : (isDark ? "#888" : "#999"),
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
                      color: isDark ? "#888" : "#999",
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
                  <div style={{ 
                    marginTop: "15px", 
                    paddingTop: "20px", 
                    borderTop: isDark ? "1px solid #222" : "1px solid #eee",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px"
                  }}>
                    {/* Header Comentarios (Estilo Instagram) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#888" }}>{t("comments_label")}</span>
                      <span style={{ fontSize: "0.8rem", color: "#1dd1a1", cursor: "pointer" }} onClick={() => setCommentingOn(null)}>{t("close")}</span>
                    </div>

                    {/* Lista de Comentarios */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                      {workout.commentsList?.length === 0 ? (
                        <div style={{ fontSize: "0.9rem", color: "#888", textAlign: "center", padding: "10px" }}>No hay comentarios aún.</div>
                      ) : (
                        workout.commentsList?.map((c, i) => (
                          <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                            {/* Avatar del que comenta */}
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: isDark ? "#333" : "#eee", overflow: "hidden", flexShrink: 0 }}>
                              {c.authorPhoto ? <img src={c.authorPhoto} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "#888" }}>?</div>}
                            </div>
                            
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: isDark ? "#fff" : "#333" }}>{c.authorName}</span>
                                <span style={{ color: "#888", fontSize: "0.75rem" }}>{getTimeAgo(c.createdAt)}</span>
                              </div>
                              <div style={{ fontSize: "0.95rem", color: isDark ? "#fff" : "#444", lineHeight: "1.4" }}>
                                {c.text}
                              </div>
                              <div style={{ marginTop: "5px", fontSize: "0.8rem", color: "#888", fontWeight: "bold", cursor: "pointer" }}>
                                {t("reply")}
                              </div>
                            </div>

                            {/* Corazón / Likes en comentario (placeholder) */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: "#888", marginTop: "2px" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                              <span style={{ fontSize: "0.65rem" }}>0</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Barra inferior fija de escritura */}
                    <div style={{ marginTop: "10px" }}>
                      {/* Emojis sugeridos */}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", padding: "0 10px" }}>
                        {emojiList.map(emoji => (
                          <span 
                            key={emoji} 
                            onClick={() => setNewComment(prev => prev + emoji)}
                            style={{ fontSize: "1.5rem", cursor: "pointer" }}
                          >
                            {emoji}
                          </span>
                        ))}
                      </div>

                      {/* Input de texto moderno */}
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "10px", 
                        backgroundColor: isDark ? "#1a1a1a" : "#fff", 
                        borderRadius: "25px", 
                        padding: "5px 5px 5px 15px",
                        border: isDark ? "1px solid #333" : "1px solid #ddd"
                      }}>
                        <input
                          placeholder={t("add_comment_placeholder")}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(workout.id)}
                          style={{
                            flex: 1,
                            backgroundColor: "transparent",
                            border: "none",
                            color: isDark ? "#fff" : "#333",
                            outline: "none",
                            fontSize: "0.95rem",
                            padding: "8px 0"
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(workout.id)}
                          disabled={!newComment.trim()}
                          style={{ 
                            backgroundColor: "#1dd1a1", 
                            color: "#000", 
                            border: "none", 
                            width: "32px", 
                            height: "32px", 
                            borderRadius: "50%", 
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            opacity: newComment.trim() ? 1 : 0.5,
                            transition: "all 0.2s"
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                        </button>
                      </div>
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
