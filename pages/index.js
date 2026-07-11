import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getWorkoutsFeed, searchUsers, likeWorkout, addWorkoutComment } from "../lib/firebase";
import { useRouter } from "next/router";
import { getTokens } from "../lib/tokens";
import { Icon, Button, Spinner, EmptyState } from "../components/ui";

export default function Home() {
  const { user, authUser, isLoaded, following, handleFollow, handleUnfollow, isMobile, refreshData, t, theme, showNotification } = useUser();
  const [feedWorkouts, setFeedWorkouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [commentingOn, setCommentingOn] = useState(null);
  const [expandedWorkout, setExpandedWorkout] = useState(null);
  const [newComment, setNewComment] = useState("");
  const router = useRouter();

  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

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

  if (!isLoaded) return <Layout><Spinner isDark={isDark} fullPage label="Cargando..." /></Layout>;

  return (
    <Layout>
      <div style={{
        maxWidth: isMobile ? "100%" : "600px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box"
      }}>

        {/* Buscador de usuarios interactivo */}
        <div style={{ marginBottom: "30px", position: "relative", padding: isMobile ? "16px 15px 0" : "0" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", color: tk.textFaint, display: "flex" }}>
                <Icon name="search" size={18} />
              </span>
              <input
                placeholder={t("search_users")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: tk.surface,
                  border: `1px solid ${tk.border}`,
                  borderRadius: tk.radius.pill,
                  padding: "12px 20px 12px 45px",
                  color: tk.text,
                  outline: "none",
                  fontSize: "1rem",
                  transition: tk.transition,
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = tk.accent}
                onBlur={(e) => e.target.style.borderColor = tk.border}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: tk.textFaint, cursor: "pointer", display: "flex" }}
                >
                  <Icon name="close" size={16} />
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
                backgroundColor: tk.surface,
                borderRadius: tk.radius.md,
                border: `1px solid ${tk.border}`,
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: tk.transition
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = tk.surfaceHover}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = tk.surface}
            >
              <div style={{ color: tk.accent, fontWeight: "bold", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="users" size={16} />
                {t("people_you_might_follow")}
              </div>
              <Icon name="chevronLeft" size={18} color={tk.accent} style={{ transform: "rotate(180deg)" }} />
            </div>
          )}

          {/* Resultados de búsqueda */}
          {searchTerm && searchResults.length > 0 && (
            <div style={{
              marginTop: "10px",
              backgroundColor: tk.surface,
              borderRadius: tk.radius.lg,
              border: `1px solid ${tk.border}`,
              maxHeight: "300px",
              overflowY: "auto",
              boxShadow: tk.shadow.float,
              zIndex: 100,
              position: "absolute",
              left: 0,
              right: 0
            }}>
              <div style={{ padding: "10px 15px", fontSize: "0.8rem", color: tk.accent, borderBottom: `1px solid ${tk.border}`, fontWeight: "bold" }}>
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
                    borderBottom: `1px solid ${tk.border}`,
                    cursor: "pointer",
                    transition: tk.transition
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = tk.surfaceHover}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: tk.radius.full, backgroundColor: tk.surfaceHover, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {u.photoURL ? <img src={u.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="user" size={18} color={tk.textFaint} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", color: tk.text }}>@{u.username}</div>
                      <div style={{ fontSize: "0.8rem", color: tk.textMuted }}>{u.firstName}</div>
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
                      {following.includes(u.id) ? t("following_btn") : t("follow_btn")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", padding: isMobile ? "0 15px" : "0", color: tk.text }}>
          <span style={{ width: "4px", height: "24px", backgroundColor: tk.accent, borderRadius: "2px" }}></span>
          {t("feed")}
        </h1>

        {/* Feed de Entrenamientos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: isMobile ? "0 15px" : "0" }}>
          {feedWorkouts.length === 0 ? (
            <EmptyState
              isDark={isDark}
              icon="dumbbell"
              title="No hay entrenamientos para mostrar"
              description="Sigue a alguien para ver su actividad en tu feed."
              action={<Button isDark={isDark} icon="users" onClick={() => router.push("/recommended")}>{t("people_you_might_follow")}</Button>}
            />
          ) : (
            feedWorkouts.map(workout => (
              <div key={workout.id} style={{ backgroundColor: tk.surface, border: `1px solid ${tk.border}`, padding: "15px", borderRadius: tk.radius.md }}>
                <div
                  onClick={() => workout.userId && router.push(`/user/${workout.userId}`)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", cursor: "pointer" }}
                >
                  <div style={{ width: "40px", height: "40px", borderRadius: tk.radius.full, backgroundColor: tk.surfaceHover, overflow: "hidden" }}>
                    {workout.userPhoto && <img src={workout.userPhoto} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: "bold", color: tk.text }}>@{workout.userName}</div>
                    <div style={{ fontSize: "0.75rem", color: tk.textMuted }}>{new Date(workout.completedAt).toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: tk.accent }}>{workout.name}</div>
                  <div style={{ fontSize: "0.9rem", color: tk.textMuted, marginTop: "5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{workout.series} series • {workout.totalVolume?.toLocaleString()} kg • {workout.totalReps} reps • {workout.totalTime || Math.floor((workout.elapsedTime || 0) / 60)} min</span>
                    <button
                      onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: tk.accent,
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
                    backgroundColor: tk.surfaceAlt,
                    borderRadius: tk.radius.md,
                    padding: "15px",
                    marginBottom: "15px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "25px",
                    border: `1px solid ${tk.border}`
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
                          <div style={{ fontWeight: "500", fontSize: "1rem", color: tk.accent }}>{t(ex.name)}</div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", padding: "5px 0", borderBottom: `1px solid ${tk.border}`, color: tk.textFaint, fontSize: "0.75rem", fontWeight: "bold", textAlign: "center" }}>
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
                              color: tk.text,
                              backgroundColor: sIdx % 2 === 0 ? "transparent" : tk.surfaceHover
                            }}>
                              <div style={{ color: tk.textFaint, fontWeight: "bold" }}>{sIdx + 1}</div>
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
                  <div style={{ fontSize: "0.9rem", color: tk.textMuted, fontStyle: "italic", borderLeft: `2px solid ${tk.accent}`, paddingLeft: "10px", margin: "10px 0" }}>
                    "{workout.comments}"
                  </div>
                )}

                <div style={{ display: "flex", gap: "20px", borderTop: `1px solid ${tk.border}`, paddingTop: "10px", marginTop: "10px" }}>
                  <button
                    onClick={() => handleLike(workout.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: workout.likes?.includes(authUser?.uid) ? tk.accent : tk.textMuted,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                  >
                    <Icon name="heart" size={20} style={{ fill: workout.likes?.includes(authUser?.uid) ? "currentColor" : "none" }} />
                    {workout.likes?.length || 0}
                  </button>
                  <button
                    onClick={() => setCommentingOn(commentingOn === workout.id ? null : workout.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: tk.textMuted,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                  >
                    <Icon name="message" size={20} />
                    {workout.commentsList?.length || 0}
                  </button>
                </div>

                {commentingOn === workout.id && (
                  <div style={{
                    marginTop: "15px",
                    paddingTop: "20px",
                    borderTop: `1px solid ${tk.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px"
                  }}>
                    {/* Header Comentarios (Estilo Instagram) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: tk.textMuted }}>{t("comments_label")}</span>
                      <span style={{ fontSize: "0.8rem", color: tk.accent, cursor: "pointer" }} onClick={() => setCommentingOn(null)}>{t("close")}</span>
                    </div>

                    {/* Lista de Comentarios */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                      {workout.commentsList?.length === 0 ? (
                        <div style={{ fontSize: "0.9rem", color: tk.textMuted, textAlign: "center", padding: "10px" }}>No hay comentarios aún.</div>
                      ) : (
                        workout.commentsList?.map((c, i) => (
                          <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                            {/* Avatar del que comenta */}
                            <div style={{ width: "32px", height: "32px", borderRadius: tk.radius.full, backgroundColor: tk.surfaceHover, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {c.authorPhoto ? <img src={c.authorPhoto} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="user" size={14} color={tk.textFaint} />}
                            </div>

                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: tk.text }}>{c.authorName}</span>
                                <span style={{ color: tk.textFaint, fontSize: "0.75rem" }}>{getTimeAgo(c.createdAt)}</span>
                              </div>
                              <div style={{ fontSize: "0.95rem", color: tk.text, lineHeight: "1.4" }}>
                                {c.text}
                              </div>
                              <div style={{ marginTop: "5px", fontSize: "0.8rem", color: tk.textMuted, fontWeight: "bold", cursor: "pointer" }}>
                                {t("reply")}
                              </div>
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
                        backgroundColor: tk.surface,
                        borderRadius: tk.radius.pill,
                        padding: "5px 5px 5px 15px",
                        border: `1px solid ${tk.border}`
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
                            color: tk.text,
                            outline: "none",
                            fontSize: "0.95rem",
                            padding: "8px 0"
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(workout.id)}
                          disabled={!newComment.trim()}
                          style={{
                            backgroundColor: tk.accent,
                            color: tk.onAccent,
                            border: "none",
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            opacity: newComment.trim() ? 1 : 0.5,
                            transition: tk.transition
                          }}
                        >
                          <Icon name="arrowRight" size={16} style={{ transform: "rotate(-90deg)" }} />
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
