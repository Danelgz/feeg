import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import { getFromCloud, getUserWorkouts, likeWorkout, addWorkoutComment, getFollowersCount, getFollowersList, getFollowingList } from "../../lib/firebase";
import { exercisesList } from "../../data/exercises";

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
    showNotification
  } = useUser();

  const isDark = theme === 'dark';

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
    return (
      <Layout>
        <div style={{ padding: isMobile ? "0" : "20px" }}>
          <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "1rem", color: isDark ? "#fff" : "#333" }}>{t("profile_title")}</h1>
          <p style={{ color: isDark ? "#ccc" : "#666" }}>{t("loading")}</p>
        </div>
      </Layout>
    );
  }

  if (!targetUser) {
    return (
      <Layout>
        <div style={{ padding: "20px", color: isDark ? "#fff" : "#333", textAlign: 'center' }}>
          Usuario no encontrado.
        </div>
      </Layout>
    );
  }

  const profile = targetUser;
  const isFollowing = following.includes(uid);

  return (
    <>
      <Layout>
        <div style={{
          backgroundColor: "#000",
          color: "#fff",
          minHeight: "100vh",
          padding: isMobile ? "10px" : "20px"
        }}>
          {/* Header - Username and Follow Layout */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "800", margin: 0, letterSpacing: "-0.5px" }}>{profile?.username || "Usuario"}</h1>

            {authUser && uid !== authUser.uid && (
              <button
                onClick={() => isFollowing ? handleUnfollow(uid) : handleFollow(uid)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  border: isFollowing ? "1px solid #333" : "none",
                  backgroundColor: isFollowing ? "transparent" : "#1dd1a1",
                  color: isFollowing ? "#fff" : "#000",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "0.9rem"
                }}
              >
                {isFollowing ? "Siguiendo" : "Seguir"}
              </button>
            )}
          </div>

          {/* Real Name */}
          <div style={{ fontSize: "1rem", color: "#1dd1a1", fontWeight: "600", marginBottom: "20px" }}>
            {profile?.firstName || "Sin nombre"}
          </div>

          {/* Photo and Stats Row */}
          <div style={{ display: "flex", gap: "25px", alignItems: "center", marginBottom: "25px" }}>
            <div
              onClick={() => setIsPhotoFullScreen(true)}
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                backgroundColor: "transparent",
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
              ) : <span style={{ fontSize: "2rem" }}>👤</span>}
            </div>

            <div style={{ flex: 1, display: "flex", justifyContent: "space-between", textAlign: "center" }}>
              <div style={{ cursor: "default" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>{workouts?.length || 0}</div>
                <div style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Entrenos</div>
              </div>
              <div onClick={handleOpenFollowers} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>{targetUser.followersCount || 0}</div>
                <div style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Seguidores</div>
              </div>
              <div onClick={handleOpenFollowing} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>{targetUser.following?.length || 0}</div>
                <div style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>Siguiendo</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{
            marginBottom: "30px",
            fontSize: "0.95rem",
            color: "#ccc",
            lineHeight: "1.5",
            backgroundColor: "#111",
            padding: "12px 15px",
            borderRadius: "12px",
            borderLeft: "3px solid #1dd1a1"
          }}>
            {profile?.description || "Sin descripción"}
          </div>

          {/* Graph Section */}
          <div style={{ marginBottom: "30px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
                Gráfico horas por semana <span style={{ color: "#888", fontSize: "0.8rem", marginLeft: "5px" }}>{overallRange}</span>
              </h2>
              <select
                value={chartFilter}
                onChange={(e) => setChartFilter(e.target.value)}
                style={{ background: "none", border: "none", color: "#1dd1a1", fontSize: "0.9rem", cursor: "pointer", outline: "none" }}
              >
                <option value="3_months" style={{ backgroundColor: "#1a1a1a" }}>Últimos 3 meses</option>
                <option value="6_months" style={{ backgroundColor: "#1a1a1a" }}>Últimos 6 meses</option>
                <option value="1_year" style={{ backgroundColor: "#1a1a1a" }}>Último año</option>
                <option value="always" style={{ backgroundColor: "#1a1a1a" }}>Siempre</option>
              </select>
            </div>

            <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "10px", position: "relative", paddingTop: "20px" }}>
              {chartData.length === 0 ? (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>Sin datos suficientes</div>
              ) : (
                chartData.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveBar(activeBar === i ? null : i)}
                    style={{
                      flex: 1,
                      backgroundColor: activeBar === i ? "#fff" : (d[chartMode] > 0 ? "#1dd1a1" : "#1a1a1a"),
                      border: d[chartMode] === 0 ? "1px solid #333" : "none",
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
                        color: "#555",
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
                        backgroundColor: "#fff",
                        color: "#000",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        whiteSpace: "nowrap",
                        zIndex: 10,
                        fontWeight: "bold",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.5)"
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
                    borderRadius: "20px",
                    border: "none",
                    backgroundColor: chartMode === m.id ? "#1dd1a1" : "#1a1a1a",
                    color: chartMode === m.id ? "#000" : "#fff",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >{m.label}</button>
              ))}
            </div>
          </div>

          {/* Workouts Section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "4px", height: "20px", backgroundColor: "#1dd1a1", borderRadius: "2px" }}></span>
              Entrenamientos
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {(!workouts || workouts.length === 0) ? (
              <div style={{ padding: "30px", textAlign: "center", backgroundColor: "#1a1a1a", borderRadius: "12px", color: "#666" }}>
                Este usuario no tiene entrenamientos registrados aún.
              </div>
            ) : (
              [...workouts]
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                .map(workout => (
                  <div key={workout.id} style={{ backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "12px" }}>
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
                                <div style={{ fontWeight: "500", fontSize: "1rem", color: "#1dd1a1" }}>{t(ex.name)}</div>
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", padding: "5px 0", borderBottom: "1px solid #1a1a1a", color: "#666", fontSize: "0.75rem", fontWeight: "bold", textAlign: "center" }}>
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
                                    color: "#fff",
                                    backgroundColor: sIdx % 2 === 0 ? "transparent" : "#0a0a0a"
                                  }}>
                                    <div style={{ color: "#666", fontWeight: "bold" }}>{sIdx + 1}</div>
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

      {/* Follow Modals */}
      {(showFollowers || showFollowing) && (
        <div
          onClick={() => { setShowFollowers(false); setShowFollowing(false); }}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 4000, padding: "20px"
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1a1a1a", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: "#fff", margin: 0 }}>{showFollowers ? "Seguidores" : "Siguiendo"}</h2>
              <button onClick={() => { setShowFollowers(false); setShowFollowing(false); }} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {(showFollowers ? followersList : followingList).length === 0 ? (
                <p style={{ color: "#888", textAlign: "center" }}>No hay nadie aquí todavía.</p>
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
                    style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "8px", borderRadius: "8px", transition: "background 0.2s" }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2a2a2a"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "transparent", overflow: "hidden" }}>
                      {u.photoURL && <img src={u.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", color: "#fff" }}>@{u.username}</div>
                      <div style={{ fontSize: "0.8rem", color: "#888" }}>{u.firstName}</div>
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
                fontSize: "2rem", cursor: "pointer"
              }}
            >
              &times;
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
