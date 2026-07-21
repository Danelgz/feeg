import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { useUser } from "../../context/UserContext";
import { getFromCloud, getUserWorkouts, getUserWorkoutsCount, getFollowersCount, getFollowersList, getFollowingList, likeWorkout, addWorkoutComment } from "../../lib/firebase";
import { getTokens } from "../../lib/tokens";
import { Spinner, EmptyState } from "../../components/ui";
import {
  ProfileHeader,
  ProfileActivityChart,
  ProfileWorkoutsSection,
  ProfileWorkoutDetailModal,
  ProfileFollowListModal,
  ProfilePhotoViewer,
} from "../../components/profile";

/**
 * Perfil de otra persona — misma estética y componentes que el perfil propio (pages/profile.js),
 * solo que en modo lectura: sin editar perfil, sin borrar/editar entrenos. ProfileHeader cambia
 * automáticamente el botón de la esquina a "Seguir/Siguiendo" en vez de editar/ajustes según qué
 * props recibe, y ProfileWorkoutsSection oculta el menú "⋮" de cada tarjeta cuando no se le pasan
 * acciones — así ambas páginas comparten el mismo código en vez de mantener una copia paralela.
 */
export default function UserProfile() {
  const router = useRouter();
  const { uid } = router.query;
  const { authUser, user: currentUser, isLoaded, isMobile, following, handleFollow, handleUnfollow, t, language, theme, showNotification } = useUser();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);

  const [targetUser, setTargetUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [workoutsCursor, setWorkoutsCursor] = useState(null);
  const [workoutsHasMore, setWorkoutsHasMore] = useState(false);
  const [workoutsTotalCount, setWorkoutsTotalCount] = useState(0);
  const [isLoadingMoreWorkouts, setIsLoadingMoreWorkouts] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [isPhotoFullScreen, setIsPhotoFullScreen] = useState(false);
  const [viewingWorkoutDetail, setViewingWorkoutDetail] = useState(null);

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

        // El gráfico de actividad se calcula sobre `workouts`, así que de momento solo refleja
        // lo cargado hasta ahora (la primera página, y más si se pulsa "cargar más") en vez del
        // historial completo — igual que en el feed principal. El contador "Entrenos" de
        // ProfileHeader, en cambio, usa getUserWorkoutsCount (query de agregación) para mostrar
        // el total real sin depender de cuánto se haya paginado.
        const [{ workouts: userWorkouts, cursor, hasMore }, totalCount] = await Promise.all([
          getUserWorkouts(uid),
          getUserWorkoutsCount(uid),
        ]);
        setWorkouts(userWorkouts);
        setWorkoutsCursor(cursor);
        setWorkoutsHasMore(hasMore);
        setWorkoutsTotalCount(totalCount);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMoreWorkouts = async () => {
    if (isLoadingMoreWorkouts || !workoutsCursor) return;
    setIsLoadingMoreWorkouts(true);
    try {
      const { workouts: nextWorkouts, cursor, hasMore } = await getUserWorkouts(uid, { cursor: workoutsCursor });
      setWorkouts((prev) => [...prev, ...nextWorkouts]);
      setWorkoutsCursor(cursor);
      setWorkoutsHasMore(hasMore);
    } finally {
      setIsLoadingMoreWorkouts(false);
    }
  };

  const handleToggleLike = async (workoutId) => {
    if (!authUser) return;
    await likeWorkout(workoutId, authUser.uid, {
      name: currentUser?.username || authUser.displayName || "Alguien",
      photo: currentUser?.photoURL || authUser.photoURL || null,
    });
    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? {
      ...w,
      likes: w.likes?.includes(authUser.uid) ? w.likes.filter((id) => id !== authUser.uid) : [...(w.likes || []), authUser.uid],
    } : w)));
  };

  const handleAddComment = async (workoutId, text) => {
    if (!authUser) return;
    const comment = {
      text,
      authorId: authUser.uid,
      authorName: currentUser?.username || authUser.displayName || "Usuario",
      authorPhoto: currentUser?.photoURL || authUser.photoURL || null,
      createdAt: Date.now(),
    };
    try {
      await addWorkoutComment(workoutId, comment);
      setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? { ...w, commentsList: [...(w.commentsList || []), comment] } : w)));
    } catch (error) {
      showNotification("Error al comentar: " + error.message, "error");
    }
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

  if (!isLoaded || loading) {
    return (
      <Layout>
        <Spinner isDark={isDark} fullPage label={t("loading")} />
      </Layout>
    );
  }

  if (!targetUser) {
    return (
      <Layout>
        <EmptyState isDark={isDark} icon="user" title="Usuario no encontrado" />
      </Layout>
    );
  }

  const isFollowing = following.includes(uid);

  return (
    <>
      <Layout>
        <div style={{ backgroundColor: tk.bg, color: tk.text, minHeight: "100vh", padding: isMobile ? "10px" : "20px" }}>
          <ProfileHeader
            isDark={isDark}
            user={targetUser}
            workoutsCount={workoutsTotalCount}
            followersCount={targetUser.followersCount}
            followingCount={targetUser.following?.length}
            isFollowing={isFollowing}
            onToggleFollow={() => (isFollowing ? handleUnfollow(uid) : handleFollow(uid))}
            onOpenPhoto={() => setIsPhotoFullScreen(true)}
            onOpenFollowers={handleOpenFollowers}
            onOpenFollowing={handleOpenFollowing}
          />

          <ProfileActivityChart isDark={isDark} completedWorkouts={workouts} />

          <ProfileWorkoutsSection
            isDark={isDark}
            completedWorkouts={workouts}
            onOpenDetail={(workout) => setViewingWorkoutDetail(workout)}
            hasMore={workoutsHasMore}
            onLoadMore={handleLoadMoreWorkouts}
            isLoadingMore={isLoadingMoreWorkouts}
            currentUserId={authUser?.uid}
            onToggleLike={handleToggleLike}
            onAddComment={handleAddComment}
            t={t}
          />
        </div>
      </Layout>

      {viewingWorkoutDetail && (
        <ProfileWorkoutDetailModal
          workout={viewingWorkoutDetail}
          language={language}
          onClose={() => setViewingWorkoutDetail(null)}
        />
      )}

      {(showFollowers || showFollowing) && (
        <ProfileFollowListModal
          isDark={isDark}
          open
          title={showFollowers ? "Seguidores" : "Siguiendo"}
          users={showFollowers ? followersList : followingList}
          onClose={() => {
            setShowFollowers(false);
            setShowFollowing(false);
          }}
        />
      )}

      <ProfilePhotoViewer open={isPhotoFullScreen} photoURL={targetUser?.photoURL} onClose={() => setIsPhotoFullScreen(false)} />
    </>
  );
}
