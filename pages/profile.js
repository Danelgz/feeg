import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import RegisterForm from "../components/RegisterForm";
import { useUser } from "../context/UserContext";
import { getFollowersList, getFollowingList, saveToCloud } from "../lib/firebase";
import { useRanks } from "../hooks/useRanks";
import { getTokens } from "../lib/tokens";
import {
  ProfileLoginPrompt,
  ProfileHeader,
  ProfileActivityChart,
  ProfileInfoMenu,
  ProfileWorkoutsSection,
  ProfileWorkoutDetailModal,
  ProfileConfirmModal,
  ProfileAddToRoutineModal,
  ProfileEditModal,
  ProfileImageCropper,
  ProfileFollowListModal,
  ProfilePhotoViewer,
  ProfileRankMapModal,
} from "../components/profile";
import { Icon } from "../components/ui";

export default function Profile() {
  const router = useRouter();
  const {
    user,
    authUser,
    saveUser,
    isLoaded,
    refreshData,
    theme,
    isMobile,
    t,
    loginWithGoogle,
    isLoggingIn,
    logout,
    completedWorkouts,
    deleteCompletedWorkout,
    deleteAllWorkouts,
    followers,
    following,
    showNotification,
    saveRoutine,
    language,
  } = useUser();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);

  // El rango (nivel/prestigio, y el desglose por grupo para el "cuerpo de rangos") se calcula
  // siempre a partir de los propios datos del usuario (measures, PRs) vía useRanks — nunca de los
  // de otra persona, cuyas medidas son privadas. Para que el perfil de otra persona pueda mostrar
  // la insignia y el mapa sin recalcularlos, se reflejan aquí en usersPublic/{uid} cada vez que
  // cambian — mismo patrón que el resto de campos públicos del perfil. Solo se guarda
  // level/rankableExercises de cada grupo (no el ejercicio a ejercicio, que sí sigue siendo
  // privado) — ver ProfileRankMapModal. syncedRankRef evita reescribir en cada render cuando el
  // valor no cambió.
  const ranks = useRanks();
  const syncedRankRef = useRef(null);
  useEffect(() => {
    if (!authUser || !ranks.available) return;
    const publicGroupRanks = Object.fromEntries(
      Object.entries(ranks.groupRanks).map(([group, r]) => [group, { level: r.level, rankableExercises: r.rankableExercises }])
    );
    const key = JSON.stringify({ o: ranks.overallLevel, p: ranks.prestigeLevels, g: publicGroupRanks });
    if (syncedRankRef.current === key) return;
    syncedRankRef.current = key;
    saveToCloud(`usersPublic/${authUser.uid}`, {
      overallLevel: ranks.overallLevel,
      prestigeLevels: ranks.prestigeLevels,
      groupRanks: publicGroupRanks,
    }).catch(() => {});
  }, [authUser, ranks.available, ranks.overallLevel, ranks.prestigeLevels, ranks.groupRanks]);

  const [isEditing, setIsEditing] = useState(false);
  const [showRankMap, setShowRankMap] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [isPhotoFullScreen, setIsPhotoFullScreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [viewingWorkoutDetail, setViewingWorkoutDetail] = useState(null);
  const [addingToRoutine, setAddingToRoutine] = useState(null);
  const [routineName, setRoutineName] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [cropSourceURL, setCropSourceURL] = useState(null);

  const [editData, setEditData] = useState({
    username: "",
    firstName: "",
    description: "",
    photoURL: "",
    sex: null,
    photoScale: 1,
    photoPosX: 0,
    photoPosY: 0,
  });

  // Forzar refresco de datos al entrar al perfil
  useEffect(() => {
    if (authUser) {
      refreshData();
    }
  }, [authUser]);

  useEffect(() => {
    if (user) {
      setEditData({
        username: user.username || "",
        firstName: user.firstName || "",
        description: user.description || "Sin descripción",
        photoURL: user.photoURL || authUser?.photoURL || "",
        // `?? null` y no `|| null`: son valores válidos y distintos de vacío, y el usuario puede
        // haber elegido explícitamente no declararlo.
        sex: user.sex ?? null,
        photoScale: user.photoScale || 1,
        photoPosX: user.photoPosX || 0,
        photoPosY: user.photoPosY || 0,
      });
    }
  }, [user, authUser]);

  const handleOpenFollowers = async () => {
    setShowFollowers(true);
    const list = await getFollowersList(authUser.uid);
    setFollowersList(list);
  };

  const handleOpenFollowing = async () => {
    setShowFollowing(true);
    const list = await getFollowingList(authUser.uid);
    setFollowingList(list);
  };

  const handleDeleteWorkout = (id) => {
    // El borrado local ya es instantáneo (deleteCompletedWorkout actualiza el estado antes de
    // tocar la nube); cerrar el modal aquí en vez de esperar al await hacía que el botón
    // "Borrar" pareciera no reaccionar hasta que la llamada a la nube terminaba.
    setConfirmDelete(null);
    deleteCompletedWorkout(id).catch((error) => {
      console.error("Error al borrar entrenamiento:", error);
      showNotification("No se pudo borrar el entrenamiento del feed público", "error");
    });
  };

  const handleAddToRoutine = async () => {
    if (!routineName.trim()) {
      showNotification("Por favor ingresa un nombre para la rutina", "error");
      return;
    }

    const workout = completedWorkouts.find((w) => w.id === addingToRoutine);
    if (!workout) return;

    const exercisesForRoutine = workout.details || workout.exerciseDetails || [];
    if (exercisesForRoutine.length === 0) {
      showNotification("Este entrenamiento no tiene ejercicios", "error");
      return;
    }

    const newRoutine = { id: Date.now(), name: routineName, exercises: exercisesForRoutine };
    await saveRoutine(newRoutine);
    showNotification(`Rutina "${routineName}" creada exitosamente`, "success");
    setAddingToRoutine(null);
    setRoutineName("");
  };

  const handleFileSelected = (file) => {
    setCropSourceURL(URL.createObjectURL(file));
  };

  const handleCropSave = (croppedURL) => {
    setEditData((prev) => ({ ...prev, photoURL: croppedURL }));
    setCropSourceURL(null);
  };

  const handleEditSave = async () => {
    if (saving) return;
    setSaving(true);
    setJustSaved(false);

    try {
      let finalPhotoURL = editData.photoURL;

      // Si el photoURL es un blob URL, significa que es una foto nueva recortada localmente
      if (editData.photoURL && editData.photoURL.startsWith("blob:")) {
        setIsProcessingImage(true);

        const blob = await fetch(editData.photoURL).then((r) => r.blob());

        const formData = new FormData();
        formData.append("file", blob);
        formData.append("upload_preset", "feeg_profile");

        const response = await fetch("https://api.cloudinary.com/v1_1/dfs9hazxo/image/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (data.secure_url) {
          finalPhotoURL = data.secure_url;
        } else {
          throw new Error("Error al subir la imagen a Cloudinary");
        }
      }

      const updatedUser = {
        ...user,
        username: editData.username,
        firstName: editData.firstName,
        description: editData.description,
        sex: editData.sex ?? null,
        photoURL: finalPhotoURL,
        photoScale: 1,
        photoPosX: 0,
        photoPosY: 0,
      };

      await saveUser(updatedUser);
      // Deja el botón en estado "Guardado" un instante antes de cerrar, para que la
      // confirmación sea visible en vez de que el modal desaparezca de golpe.
      setJustSaved(true);
      await new Promise((resolve) => setTimeout(resolve, 550));
      setIsEditing(false);
    } catch (e) {
      console.error("Error en handleEditSave:", e);
      showNotification(e.message || "Hubo un problema al guardar.", "error");
    } finally {
      setSaving(false);
      setIsProcessingImage(false);
      setJustSaved(false);
    }
  };

  // Solo se vacía la pantalla si de verdad no hay perfil que pintar. Con `|| isSyncing` el perfil
  // desaparecía en cada sincronización de fondo (una por cada vez que se entra al apartado), aunque
  // los datos ya estuvieran en estado desde localStorage.
  if (!isLoaded && !user) {
    return (
      <Layout>
        <div style={{ padding: isMobile ? "0" : "20px" }}>
          <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "1rem", color: tk.text }}>{t("profile_title")}</h1>
          <p style={{ color: tk.textMuted }}>{t("loading")}</p>
        </div>
      </Layout>
    );
  }

  // Si no hay usuario autenticado, mostrar opciones de login/registro
  if (!authUser) {
    return (
      <Layout>
        <ProfileLoginPrompt isDark={isDark} isMobile={isMobile} t={t} loginWithGoogle={loginWithGoogle} isLoggingIn={isLoggingIn} />
      </Layout>
    );
  }

  // Si autenticado pero sin perfil completado, pedir datos actuales
  if (authUser && !user) {
    return (
      <Layout>
        <div style={{ padding: isMobile ? "0" : "20px" }}>
          <RegisterForm
            onRegister={(data) => {
              saveUser({
                ...data,
                email: authUser.email || null,
                uid: authUser.uid,
                photoURL: authUser.photoURL || null,
              });
            }}
          />
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <div style={{ backgroundColor: tk.bg, color: tk.text, minHeight: "100vh", padding: isMobile ? "10px" : "20px" }}>
          <ProfileHeader
            isDark={isDark}
            user={user}
            workoutsCount={completedWorkouts?.length}
            followersCount={followers?.length}
            followingCount={following?.length}
            onEdit={() => setIsEditing(true)}
            onOpenSettings={() => router.push("/settings")}
            onOpenPhoto={() => setIsPhotoFullScreen(true)}
            onOpenFollowers={handleOpenFollowers}
            onOpenFollowing={handleOpenFollowing}
          />

          <ProfileActivityChart isDark={isDark} completedWorkouts={completedWorkouts} />

          <ProfileInfoMenu
            isDark={isDark}
            extraItems={
              ranks.available
                ? [{ label: "Cuerpo de rangos", icon: <Icon name="award" size={20} />, onClick: () => setShowRankMap(true) }]
                : []
            }
          />

          <ProfileWorkoutsSection
            isDark={isDark}
            completedWorkouts={completedWorkouts}
            onOpenDetail={(workout) => setViewingWorkoutDetail(workout)}
            onAddToRoutine={(id) => setAddingToRoutine(id)}
            onDeleteWorkout={(id) => setConfirmDelete(id)}
            onEditWorkout={(workout) => router.push(`/routines/create?editWorkout=${workout.id}`)}
            onDeleteAll={() => setConfirmDeleteAll(true)}
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

      <ProfileConfirmModal
        isDark={isDark}
        open={!!confirmDelete}
        title="¿Borrar entrenamiento?"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => handleDeleteWorkout(confirmDelete)}
      />

      <ProfileConfirmModal
        isDark={isDark}
        open={confirmDeleteAll}
        title={t("confirm_delete_all_title")}
        message={t("confirm_delete_all_msg")}
        confirmLabel={t("delete_all")}
        cancelLabel={t("cancel")}
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={() => {
          setConfirmDeleteAll(false);
          deleteAllWorkouts().catch((error) => {
            console.error("Error al borrar todos los entrenamientos:", error);
            showNotification("No se pudieron borrar todos los entrenamientos del feed público", "error");
          });
        }}
      />

      <ProfileAddToRoutineModal
        isDark={isDark}
        open={!!addingToRoutine}
        routineName={routineName}
        onChangeRoutineName={setRoutineName}
        onConfirm={handleAddToRoutine}
        onClose={() => {
          setAddingToRoutine(null);
          setRoutineName("");
        }}
      />

      <ProfileEditModal
        isDark={isDark}
        open={isEditing}
        editData={editData}
        setEditData={setEditData}
        isProcessingImage={isProcessingImage}
        saving={saving}
        justSaved={justSaved}
        onFileSelected={handleFileSelected}
        onSave={handleEditSave}
        onClose={() => setIsEditing(false)}
      />

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

      <ProfilePhotoViewer open={isPhotoFullScreen} photoURL={user?.photoURL} onClose={() => setIsPhotoFullScreen(false)} />

      {showRankMap && (
        <ProfileRankMapModal
          isDark={isDark}
          overallLevel={ranks.overallLevel}
          prestigeLevels={ranks.prestigeLevels}
          groupRanks={ranks.groupRanks}
          sex={ranks.sex}
          faceStyleId={user?.faceStyle}
          t={t}
          onClose={() => setShowRankMap(false)}
        />
      )}

      {cropSourceURL && (
        <ProfileImageCropper
          key={cropSourceURL}
          sourcePhotoURL={cropSourceURL}
          onSave={handleCropSave}
          onClose={() => setCropSourceURL(null)}
        />
      )}
    </>
  );
}
