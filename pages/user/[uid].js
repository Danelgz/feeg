import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import { getFromCloud, getUserWorkouts, likeWorkout, addWorkoutComment } from "../../lib/firebase";

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
    handleUnfollow 
  } = useUser();

  const [targetUser, setTargetUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentingOn, setCommentingOn] = useState(null);
  const [newComment, setNewComment] = useState("");

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
      // Ahora cargamos de la colección PÚBLICA para que no falle por las reglas
      const userData = await getFromCloud(`usersPublic/${uid}`);
      if (userData) {
        setTargetUser(userData);
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
      createdAt: Date.now()
    };
    await addWorkoutComment(workoutId, comment);
    setWorkouts(prev => prev.map(w => w.id === workoutId ? {
      ...w,
      commentsList: [...(w.commentsList || []), comment]
    } : w));
    setNewComment("");
    setCommentingOn(null);
  };

  if (!isLoaded || loading) {
    return (
      <Layout>
        <div style={{ padding: "20px", color: "#fff", textAlign: 'center' }}>
          Cargando perfil...
        </div>
      </Layout>
    );
  }

  if (!targetUser) {
    return (
      <Layout>
        <div style={{ padding: "20px", color: "#fff", textAlign: 'center' }}>
          Usuario no encontrado.
        </div>
      </Layout>
    );
  }

  const profile = targetUser; // En usersPublic los datos están al nivel raíz
  const isFollowing = following.includes(uid);

  return (
    <Layout>
      <div style={{
        backgroundColor: "#000",
        color: "#fff",
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "600px",
        margin: "0 auto"
      }}>
        {/* Profile Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "#fff",
            overflow: "hidden"
          }}>
            {profile?.photoURL ? <img src={profile.photoURL} alt="Perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>@{profile?.username || "usuario"}</div>
            <div style={{ color: "#aaa", fontSize: "0.9rem" }}>{profile?.firstName}</div>
            <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
              <div><span style={{ fontWeight: "bold" }}>{workouts.length}</span> Entrenos</div>
              <div><span style={{ fontWeight: "bold" }}>{targetUser.followersCount || 0}</span> Seguidores</div>
              <div><span style={{ fontWeight: "bold" }}>{targetUser.followingCount || 0}</span> Siguiendo</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => isFollowing ? handleUnfollow(uid) : handleFollow(uid)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "10px",
              border: isFollowing ? "1px solid #333" : "none",
              backgroundColor: isFollowing ? "transparent" : "#1dd1a1",
              color: isFollowing ? "#fff" : "#000",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {isFollowing ? "Dejar de seguir" : "Seguir"}
          </button>
        </div>

        {profile?.description && (
          <div style={{ marginBottom: "30px", fontSize: "0.95rem", color: "#ccc" }}>
            {profile.description}
          </div>
        )}

        <h3 style={{ borderBottom: "1px solid #333", paddingBottom: "10px", marginBottom: "20px" }}>Entrenamientos</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {workouts.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center" }}>Este usuario aún no ha publicado entrenamientos.</div>
          ) : (
            workouts.map(workout => (
              <div key={workout.id} style={{ backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "12px" }}>
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#1dd1a1" }}>{workout.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#888" }}>{new Date(workout.completedAt).toLocaleString()}</div>
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "0.9rem", color: "#ccc" }}>
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
