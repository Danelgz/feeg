import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import { getFromCloud, getUserWorkouts, likeWorkout, addWorkoutComment, getFollowersCount, getFollowersList, getFollowingList } from "../../lib/firebase";
import { exercisesList } from "../../data/exercises";
import { getTokens } from "../../lib/tokens";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { Icon, Button, Spinner, EmptyState } from "../../components/ui";

export default function UserProfile() {
  const router = useRouter();
  const { uid } = router.query;
  const {
    authUser,
    user: currentUser,
    isLoaded,
    isMobile,
    following,
    handleFollow,
    handleUnfollow,
    theme,
    t,
    language,
    showNotification
  } = useUser();

  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [targetUser, setTargetUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [commentingOn, setCommentingOn] = useState(null);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [expandedWorkout, setExpandedWorkout] = useState(null);
  const [hoveredWorkout, setHoveredWorkout] = useState(null);
  const [isPhotoFullScreen, setIsPhotoFullScreen] = useState(false);

  // Graph state
  const [chartFilter, setChartFilter] = useState("3_months");
  const [chartMode, setChartMode] = useState("duration"); // duration, volume, reps
  const [activeBar, setActiveBar] = useState(null);

  const emojiList = ["💪", "🔥", "👏", "🏋️", "👊", "🤤", "🏆"];

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

  const getExerciseInfo = (name) => {
    for (const group in exercisesList) {
      const ex = exercisesList[group].find(e => e.name === name);
      if (ex) return ex;
    }
    return null;
  };

  const handleOpenFollowers = async () => {
    setShowFollowers(true);
    const list = await getFollowersList(uid);
    setFollowersList(list);
  };

  const handleOpenFollowing = async () => {
    setShowFollowing(true);
    const list = await getFollowingList(uid);
    setFollowingList(list);
  };

  useEffect(() => {
    if (uid) {
      if (uid === authUser?.uid) {
        router.push("/profile");
        return;
      }
      fetchUserData();
    }
  }, [uid, authUser]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const userData = await getFromCloud(`usersPublic/${uid}`);
      if (userData) {
        const fCount = await getFollowersCount(uid);
        setTargetUser({ ...userData, followersCount: fCount });

        const userWorkouts = await getUserWorkouts(uid);
        setWorkouts(userWorkouts);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (workoutId) => {
    if (!authUser) return;
    await likeWorkout(workoutId, authUser.uid);
    setWorkouts(prev => prev.map(w => w.id === workoutId ? {
      ...w,
      likes: w.likes?.includes(authUser.uid) ? w.likes.filter(id => id !== authUser.uid) : [...(w.likes || []), authUser.uid]
    } : w));
  };

  const handleAddComment = async (workoutId) => {
    if (!newComment.trim() || !authUser) return;
    const comment = {
      text: newComment,
      authorId: authUser.uid,
      authorName: currentUser?.username || authUser.displayName || "Usuario",
      authorPhoto: currentUser?.photoURL || authUser.photoURL || null,
      createdAt: Date.now()
    };
    try {
      await addWorkoutComment(workoutId, comment);
      setWorkouts(prev => prev.map(w => w.id === workoutId ? {
        ...w,
        commentsList: [...(w.commentsList || []), comment]
      } : w));
      setNewComment("");
      setCommentingOn(null);
    } catch (error) {
      showNotification("Error al comentar: " + error.message, 'error');
    }
  };

  // Graph data processing (same as profile)
  const getChartData = () => {
    if (!workouts || !Array.isArray(workouts)) return [];

    try {
      const now = new Date();
      let startDate = new Date();
      if (chartFilter === "3_months") startDate.setMonth(now.getMonth() - 3);
      else if (chartFilter === "6_months") startDate.setMonth(now.getMonth() - 6);
      else if (chartFilter === "1_year") startDate.setFullYear(now.getFullYear() - 1);
      else startDate = new Date(0);

      const startDay = startDate.getDay();
      const startDiff = startDate.getDate() - startDay + (startDay === 0 ? -6 : 1);
      startDate = new Date(new Date(startDate).setDate(startDiff));
      startDate.setHours(0, 0, 0, 0);

      const weeks = [];
      const weeksMap = {};

      let current = new Date(startDate);
      while (current <= now) {
        const weekKey = current.toISOString().split('T')[0];
        const weekEnd = new Date(current);
        weekEnd.setDate(current.getDate() + 6);

        const weekObj = {
          duration: 0,
          volume: 0,
          reps: 0,
          count: 0,
          date: new Date(current),
          range: `${current.getDate()}-${weekEnd.getDate()}`
        };
        weeksMap[weekKey] = weekObj;
        weeks.push(weekObj);

        current.setDate(current.getDate() + 7);
      }

      workouts.forEach(w => {
        if (!w || !w.completedAt) return;
        const date = new Date(w.completedAt);
        if (isNaN(date.getTime()) || date < startDate) return;

        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(new Date(date).setDate(diff));
        monday.setHours(0, 0, 0, 0);
        const weekKey = monday.toISOString().split('T')[0];

        if (weeksMap[weekKey]) {
          weeksMap[weekKey].duration += (Number(w.elapsedTime) || (Number(w.totalTime) * 60) || 0) / 3600;
          weeksMap[weekKey].volume += Number(w.totalVolume) || 0;
          weeksMap[weekKey].reps += Number(w.totalReps) || 0;
          weeksMap[weekKey].count += 1;
        }
      });

      return weeks;
    } catch (e) {
      console.error("Error generating chart data:", e);
      return [];
    }
  };

  const spanishMonths = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const formatRangeDate = (date) => date ? `${date.getDate()} ${spanishMonths[date.getMonth()]}` : "";

  const chartData = getChartData();
  const overallRange = chartData.length > 0
    ? `(${formatRangeDate(chartData[0].date)}, ${formatRangeDate(new Date())})`
    : "";
  const maxVal = Math.max(chartMode === 'duration' ? 5 : 1, ...chartData.map(d => d[chartMode]), 1);

  if (!isLoaded || loading) {
    return <Layout><Spinner isDark={isDark} fullPage label={t("loading")} /></Layout>;
  }

  if (!targetUser) {
    return (
      <Layout>
        <EmptyState isDark={isDark} icon="user" title="Usuario no encontrado" />
      </Layout>
    );
  }

  const profile = targetUser;
  const isFollowing = following.includes(uid);

  return (
    <>
      <Layout>
        <div>
          {/* Header - Username and Follow Layout */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "800", margin: 0, letterSpacing: "-0.5px", color: tk.text }}>{profile?.username || "Usuario"}</h1>

            {authUser && uid !== authUser.uid && (
              <Button
                isDark={isDark}
                size="sm"
                variant={isFollowing ? "secondary" : "primary"}
                onClick={() => isFollowing ? handleUnfollow(uid) : handleFollow(uid)}
              >
                {isFollowing ? "Siguiendo" : "Seguir"}
              </Button>
            )}
          </div>

          {/* Real Name */}
          <div style={{ fontSize: "1rem", color: tk.accent, fontWeight: "600", marginBottom: "20px" }}>
            {profile?.firstName || "Sin nombre"}
          </div>

          {/* Photo and Stats Row */}
          <div style={{ display: "flex", gap: "25px", alignItems: "center", marginBottom: "25px" }}>
            <div
              onClick={() => setIsPhotoFullScreen(true)}
              style={{
                width: "100px",
                height: "100px",
                borderRadius: tk.radius.full,
                backgroundColor: tk.surfaceHover,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                cursor: "pointer",
                flexShrink: 0
              }}
            >
              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt="Perfil"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              ) : <Icon name="user" size={36} color={tk.textFaint} />}
            </div>

            <div style={{ flex: 1, display: "flex", justifyContent: "space-between", textAlign: "center" }}>
              <div style={{ cursor: "default" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: tk.text }}>{workouts?.length || 0}</div>
                <div style={{ color: tk.textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Entrenos</div>
              </div>
              <div onClick={handleOpenFollowers} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: tk.text }}>{targetUser.followersCount || 0}</div>
                <div style={{ color: tk.textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Seguidores</div>
              </div>
              <div onClick={handleOpenFollowing} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: tk.text }}>{targetUser.following?.length || 0}</div>
                <div style={{ color: tk.textMuted, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Siguiendo</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{
            marginBottom: "30px",
            fontSize: "0.95rem",
            color: tk.textMuted,
            lineHeight: "1.5",
            backgroundColor: tk.surfaceAlt,
            padding: "12px 15px",
            borderRadius: tk.radius.md,
            borderLeft: `3px solid ${tk.accent}`
          }}>
            {profile?.description || "Sin descripción"}
          </div>

          {/* Graph Section */}
          <div style={{ marginBottom: "30px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h2 style={{ fontSize: "1.1rem", margin: 0, color: tk.text }}>
                Gráfico horas por semana <span style={{ color: tk.textMuted, fontSize: "0.8rem", marginLeft: "5px" }}>{overallRange}</span>
              </h2>
              <select
                value={chartFilter}
                onChange={(e) => setChartFilter(e.target.value)}
                style={{ background: "none", border: "none", color: tk.accent, fontSize: "0.9rem", cursor: "pointer", outline: "none" }}
              >
                <option value="3_months" style={{ backgroundColor: tk.surface }}>Últimos 3 meses</option>
                <option value="6_months" style={{ backgroundColor: tk.surface }}>Últimos 6 meses</option>
                <option value="1_year" style={{ backgroundColor: tk.surface }}>Último año</option>
                <option value="always" style={{ backgroundColor: tk.surface }}>Siempre</option>
              </select>
            </div>

            <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "10px", position: "relative", paddingTop: "20px" }}>
              {chartData.length === 0 ? (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: tk.textFaint }}>Sin datos suficientes</div>
              ) : (
                chartData.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveBar(activeBar === i ? null : i)}
                    style={{
                      flex: 1,
                      backgroundColor: activeBar === i ? tk.text : (d[chartMode] > 0 ? tk.accent : tk.surfaceAlt),
                      border: d[chartMode] === 0 ? `1px solid ${tk.border}` : "none",
                      height: `${Math.max(5, (d[chartMode] / maxVal) * 100)}%`,
                      borderRadius: "2px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      position: "relative"
                    }}
                  >
                    {i % 2 === 0 && (
                      <div style={{
                        position: "absolute",
                        bottom: "105%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: tk.textFaint,
                        fontSize: "0.6rem",
                        whiteSpace: "nowrap",
                        fontWeight: "bold"
                      }}>
                        {d.range}
                      </div>
                    )}
                    {activeBar === i && (
                      <div style={{
                        position: "absolute",
                        bottom: "110%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: tk.text,
                        color: tk.bg,
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        whiteSpace: "nowrap",
                        zIndex: 10,
                        fontWeight: "bold",
                        boxShadow: tk.shadow.card
                      }}>
                        {chartMode === 'duration' ? `${d.duration.toFixed(1)}h` :
                          chartMode === 'volume' ? `${d.volume.toLocaleString()}kg` :
                            `${d.reps.toLocaleString()} reps`}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
              {[
                { id: "duration", label: "Duración" },
                { id: "volume", label: "Volumen" },
                { id: "reps", label: "Repeticiones" }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setChartMode(m.id)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: tk.radius.pill,
                    border: "none",
                    backgroundColor: chartMode === m.id ? tk.accent : tk.surfaceAlt,
                    color: chartMode === m.id ? tk.onAccent : tk.text,
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: tk.transition
                  }}
                >{m.label}</button>
              ))}
            </div>
          </div>

          {/* Workouts Section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "10px", color: tk.text }}>
              <span style={{ width: "4px", height: "20px", backgroundColor: tk.accent, borderRadius: "2px" }}></span>
              Entrenamientos
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {(!workouts || workouts.length === 0) ? (
              <EmptyState isDark={isDark} icon="dumbbell" title="Este usuario no tiene entrenamientos registrados aún" />
            ) : (
              [...workouts]
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                .map(workout => (
                  <div key={workout.id} style={{ backgroundColor: tk.surface, border: `1px solid ${tk.border}`, padding: "15px", borderRadius: tk.radius.md }}>
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
                        {workout.exerciseDetails.map((ex, idx) => {
                          const info = getExerciseInfo(ex.name);
                          const isTimeBased = info?.type === 'time';
                          const isLastre = info?.unit === 'lastre';

                          return (
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
                                <div style={{ fontWeight: "500", fontSize: "1rem", color: tk.accent }}>{translateExerciseName(ex.name, language)}</div>
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", padding: "5px 0", borderBottom: `1px solid ${tk.border}`, color: tk.textFaint, fontSize: "0.75rem", fontWeight: "bold", textAlign: "center" }}>
                                  <div>SERIE</div>
                                  <div>{isTimeBased ? "TIEMPO (MIN)" : isLastre ? "LASTRE (KG)" : "PESO (KG)"}</div>
                                  <div>{isTimeBased ? "KM/H" : "REPS"}</div>
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
                                    <div>{s.weight || "-"}{isTimeBased ? "m" : isLastre ? "L" : ""}</div>
                                    <div>{s.reps || "-"}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
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
                                transition: "all 0.2s"
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

      {/* Follow Modals */}
      {(showFollowers || showFollowing) && (
        <div
          onClick={() => { setShowFollowers(false); setShowFollowing(false); }}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 4000, padding: "20px"
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: tk.surface, padding: "25px", borderRadius: tk.radius.lg, width: "100%", maxWidth: "400px", maxHeight: "80vh", overflowY: "auto", border: `1px solid ${tk.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: tk.text, margin: 0 }}>{showFollowers ? "Seguidores" : "Siguiendo"}</h2>
              <button onClick={() => { setShowFollowers(false); setShowFollowing(false); }} style={{ background: "none", border: "none", color: tk.text, cursor: "pointer", display: "flex" }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {(showFollowers ? followersList : followingList).length === 0 ? (
                <p style={{ color: tk.textMuted, textAlign: "center" }}>No hay nadie aquí todavía.</p>
              ) : (
                (showFollowers ? followersList : followingList).map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (u.id === authUser?.uid) {
                        router.push("/profile");
                      } else {
                        router.push(`/user/${u.id}`);
                        setTargetUser(null);
                      }
                      setShowFollowers(false);
                      setShowFollowing(false);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "8px", borderRadius: tk.radius.sm, transition: tk.transition }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = tk.surfaceHover}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div style={{ width: "40px", height: "40px", borderRadius: tk.radius.full, backgroundColor: tk.surfaceHover, overflow: "hidden" }}>
                      {u.photoURL && <img src={u.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", color: tk.text }}>@{u.username}</div>
                      <div style={{ fontSize: "0.8rem", color: tk.textMuted }}>{u.firstName}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Photo Modal */}
      {isPhotoFullScreen && (
        <div
          onClick={() => setIsPhotoFullScreen(false)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 5000, padding: "20px", cursor: "pointer"
          }}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setIsPhotoFullScreen(false); }}
              style={{
                position: "absolute", top: "-40px", right: "0",
                background: "none", border: "none", color: "#fff",
                cursor: "pointer", display: "flex"
              }}
            >
              <Icon name="close" size={26} />
            </button>
            <img
              src={profile?.photoURL || "/logo2.png"}
              alt="Profile Full"
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "10px" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
