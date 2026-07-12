import { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getWorkoutsFeed, searchUsers, likeWorkout, addWorkoutComment } from "../lib/firebase";
import { useRouter } from "next/router";
import { getTokens } from "../lib/tokens";
import { ExerciseThumb } from "../components/workout";
import { Icon, Button, Spinner, EmptyState, Avatar } from "../components/ui";

function formatFeedDuration(workout) {
  const totalSeconds = workout.elapsedTime || (workout.totalTime || 0) * 60;
  const m = Math.floor(totalSeconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

export default function Home() {
  const { user, authUser, isLoaded, following, handleFollow, handleUnfollow, isMobile, refreshData, t, theme, showNotification } = useUser();
  const [feedWorkouts, setFeedWorkouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [commentingOn, setCommentingOn] = useState(null);
  const [newComment, setNewComment] = useState("");
  // Qué tarjetas tienen la lista de ejercicios expandida más allá de los 2 primeros.
  const [expandedExercisesFor, setExpandedExercisesFor] = useState({});
  // Qué ejercicios concretos (workoutId_idx) tienen su tabla de series abierta.
  const [expandedSeriesFor, setExpandedSeriesFor] = useState({});
  const commentInputRef = useRef(null);
  const router = useRouter();

  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const getTimeAgo = (timestamp) => {
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

  const handleReplyTo = (workoutId, authorName) => {
    setCommentingOn(workoutId);
    setNewComment(`@${authorName} `);
    requestAnimationFrame(() => commentInputRef.current?.focus());
  };

  const handleShare = async (workout) => {
    const text = `${workout.userName ? "@" + workout.userName + " — " : ""}${workout.name} · ${(workout.totalVolume || 0).toLocaleString()} kg · ${workout.series || 0} ${t("series_label").toLowerCase()}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: workout.name, text });
      } catch (_) {
        /* el usuario canceló el share nativo, no es un error */
      }
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        showNotification(t("copied_to_clipboard"), "success");
      } catch (_) {
        /* portapapeles bloqueado por el navegador, fallar en silencio */
      }
    }
  };

  const toggleShowAllExercises = (workoutId) => {
    setExpandedExercisesFor((prev) => ({ ...prev, [workoutId]: !prev[workoutId] }));
  };

  const toggleSeriesTable = (key) => {
    setExpandedSeriesFor((prev) => ({ ...prev, [key]: !prev[key] }));
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
                    <Avatar photoURL={u.photoURL} name={u.username || u.firstName} size={40} />
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
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "0" : "20px", padding: isMobile ? "0" : "0" }}>
          {feedWorkouts.length === 0 ? (
            <EmptyState
              isDark={isDark}
              icon="dumbbell"
              title={t("no_workouts_to_show")}
              action={<Button isDark={isDark} icon="users" onClick={() => router.push("/recommended")}>{t("people_you_might_follow")}</Button>}
            />
          ) : (
            feedWorkouts.map(workout => {
              const liked = !!workout.likes?.includes(authUser?.uid);
              const exercises = workout.exerciseDetails || [];
              const showAllExercises = !!expandedExercisesFor[workout.id];
              const visibleExercises = showAllExercises ? exercises : exercises.slice(0, 2);
              const hiddenCount = exercises.length - visibleExercises.length;

              return (
                <div
                  key={workout.id}
                  style={{
                    backgroundColor: isMobile ? tk.bg : tk.surface,
                    border: isMobile ? "none" : `1px solid ${tk.border}`,
                    borderBottom: `1px solid ${tk.border}`,
                    padding: isMobile ? "18px 15px" : "18px",
                    borderRadius: isMobile ? 0 : tk.radius.lg,
                    boxShadow: isMobile ? "none" : tk.shadow.card,
                  }}
                >
                  <div
                    onClick={() => workout.userId && router.push(`/user/${workout.userId}`)}
                    style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", cursor: "pointer" }}
                  >
                    <Avatar photoURL={workout.userPhoto} name={workout.userName} size={42} />
                    <div>
                      <div style={{ fontWeight: "bold", color: tk.text }}>@{workout.userName}</div>
                      <div style={{ fontSize: "0.78rem", color: tk.textFaint }}>
                        {getTimeAgo(new Date(workout.completedAt).getTime())}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: "1.15rem", fontWeight: 800, color: tk.text, marginBottom: "14px" }}>
                    {workout.name}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
                    {[
                      { key: "time", label: t("total_time"), value: formatFeedDuration(workout) },
                      { key: "volume", label: t("volume"), value: `${(workout.totalVolume || 0).toLocaleString()} kg` },
                      { key: "series", label: t("series_label"), value: workout.series || 0 },
                    ].map((stat) => (
                      <div key={stat.key}>
                        <div style={{ color: tk.textFaint, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                          {stat.label}
                        </div>
                        <div style={{ color: tk.text, fontSize: "1rem", fontWeight: 700, marginTop: "2px" }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {visibleExercises.length > 0 && (
                    <div style={{ borderTop: `1px solid ${tk.border}`, paddingTop: "12px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {visibleExercises.map((ex, idx) => {
                        const seriesKey = `${workout.id}_${idx}`;
                        const isSeriesOpen = !!expandedSeriesFor[seriesKey];
                        return (
                          <div key={idx}>
                            <div
                              onClick={() => toggleSeriesTable(seriesKey)}
                              style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                            >
                              <ExerciseThumb name={ex.name} size={36} />
                              <div style={{ flex: 1, fontSize: "0.88rem", color: tk.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <span style={{ color: tk.textFaint }}>{ex.series?.length || 0} {t("series_label").toLowerCase()}</span>{" "}
                                {t(ex.name)}
                              </div>
                              <Icon
                                name="chevronRight"
                                size={15}
                                color={tk.textFaint}
                                style={{ flexShrink: 0, transform: isSeriesOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 200ms ease" }}
                              />
                            </div>

                            {isSeriesOpen && (
                              <div style={{ marginTop: "8px", marginLeft: "46px", backgroundColor: tk.surfaceAlt, borderRadius: tk.radius.sm, border: `1px solid ${tk.border}`, overflow: "hidden" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", padding: "6px 10px", color: tk.textFaint, fontSize: "0.68rem", fontWeight: "bold", textAlign: "center", borderBottom: `1px solid ${tk.border}` }}>
                                  <div>{t("serie_upper")}</div>
                                  <div>{t("weight_upper")}</div>
                                  <div>{t("reps_upper")}</div>
                                </div>
                                {(ex.series || []).map((s, sIdx) => (
                                  <div
                                    key={sIdx}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "40px 1fr 1fr",
                                      padding: "6px 10px",
                                      textAlign: "center",
                                      fontSize: "0.85rem",
                                      color: tk.text,
                                      backgroundColor: sIdx % 2 === 0 ? "transparent" : tk.surfaceHover,
                                    }}
                                  >
                                    <div style={{ color: tk.textFaint, fontWeight: "bold" }}>{sIdx + 1}</div>
                                    <div>{s.weight || "-"}</div>
                                    <div>{s.reps || "-"}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {exercises.length > 2 && (
                        <button
                          onClick={() => toggleShowAllExercises(workout.id)}
                          style={{ background: "none", border: "none", color: tk.textMuted, fontSize: "0.82rem", cursor: "pointer", padding: "4px 0 0", textAlign: "center" }}
                        >
                          {showAllExercises ? t("hide_details") : t("see_more_exercises").replace("{count}", hiddenCount)}
                        </button>
                      )}
                    </div>
                  )}

                  {workout.comments && (
                    <div style={{ fontSize: "0.9rem", color: tk.textMuted, fontStyle: "italic", borderLeft: `2px solid ${tk.accent}`, paddingLeft: "10px", margin: "10px 0" }}>
                      "{workout.comments}"
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "20px", borderTop: `1px solid ${tk.border}`, paddingTop: "12px", marginTop: "4px" }}>
                    <button
                      onClick={() => handleLike(workout.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: liked ? tk.accent : tk.textMuted,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        cursor: "pointer",
                        fontSize: "0.9rem"
                      }}
                    >
                      <Icon name="heart" size={20} style={{ fill: liked ? "currentColor" : "none" }} />
                      {workout.likes?.length || 0}
                    </button>
                    <button
                      onClick={() => setCommentingOn(commentingOn === workout.id ? null : workout.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: commentingOn === workout.id ? tk.accent : tk.textMuted,
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
                    <button
                      onClick={() => handleShare(workout)}
                      title={t("share")}
                      style={{
                        background: "none",
                        border: "none",
                        color: tk.textMuted,
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        marginLeft: "auto",
                      }}
                    >
                      <Icon name="share" size={20} />
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
                          <div style={{ fontSize: "0.9rem", color: tk.textMuted, textAlign: "center", padding: "10px" }}>{t("no_comments_yet")}</div>
                        ) : (
                          workout.commentsList?.map((c, i) => (
                            <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                              <Avatar photoURL={c.authorPhoto} name={c.authorName} size={32} />

                              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: tk.text }}>{c.authorName}</span>
                                  <span style={{ color: tk.textFaint, fontSize: "0.75rem" }}>{getTimeAgo(c.createdAt)}</span>
                                </div>
                                <div style={{ fontSize: "0.95rem", color: tk.text, lineHeight: "1.4" }}>
                                  {c.text}
                                </div>
                                <div
                                  onClick={() => handleReplyTo(workout.id, c.authorName)}
                                  style={{ marginTop: "5px", fontSize: "0.8rem", color: tk.textMuted, fontWeight: "bold", cursor: "pointer" }}
                                >
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
                            ref={commentInputRef}
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
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
