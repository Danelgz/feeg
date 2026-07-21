import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { translations } from '../data/translations';
import {
  onAuthChange,
  signInWithGoogle,
  getGoogleRedirectResult,
  signOutUser,
  saveToCloud,
  getFromCloud,
  deleteFromCloud,
  getPublicWorkoutDocId,
  bulkSaveWorkoutsToCloud,
  deleteAllPublicWorkoutsForUser,
  followUser,
  unfollowUser,
  getFollowersCount,
  getFollowersList,
  getFollowingList,
  subscribeToNotifications,
  markNotificationsRead as markNotificationsReadInCloud,
} from '../lib/firebase';
import { clearSnapshot as clearWorkoutSessionSnapshot } from '../lib/workoutStorage';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null); // Perfil completado (datos adicionales)
  const [authUser, setAuthUser] = useState(null); // Usuario autenticado (Firebase)
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastLocalUpdate = useRef(0);
  const [theme, setTheme] = useState('dark');
  const [themePreference, setThemePreferenceState] = useState('dark'); // 'dark' | 'light' | 'system'
  const [language, setLanguage] = useState('es');
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [completedWorkouts, setCompletedWorkouts] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const [isMobile, setIsMobile] = useState(false);
  const [notification, setNotification] = useState(null);
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Función para mostrar notificaciones personalizadas
  const showNotification = (message, type = 'info', duration = 4000) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, duration);
  };

  // Detectar móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Función de traducción
  const t = (key) => {
    return translations[language][key] || key;
  };

  // Cargar datos iniciales desde localStorage (para rapidez)
  useEffect(() => {
    const savedUser = localStorage.getItem('userProfile');
    const savedTheme = localStorage.getItem('theme');
    const savedThemePreference = localStorage.getItem('themePreference');
    const savedLanguage = localStorage.getItem('language');
    const savedActiveRoutine = localStorage.getItem('activeRoutine');
    const savedWorkouts = localStorage.getItem('completedWorkouts');
    const savedRoutines = localStorage.getItem('routines');
    const savedMeasures = localStorage.getItem('measures');
    const savedSoundEnabled = localStorage.getItem('soundEnabled');

    if (savedUser) try { setUser(JSON.parse(savedUser)); } catch (e) {}
    if (savedTheme) setTheme(savedTheme);
    if (savedThemePreference) setThemePreferenceState(savedThemePreference);
    if (savedLanguage) setLanguage(savedLanguage);
    if (savedActiveRoutine) try { setActiveRoutine(JSON.parse(savedActiveRoutine)); } catch (e) {}
    if (savedWorkouts) try { setCompletedWorkouts(JSON.parse(savedWorkouts)); } catch (e) {}
    if (savedRoutines) try { setRoutines(JSON.parse(savedRoutines)); } catch (e) {}
    if (savedMeasures) try { setMeasures(JSON.parse(savedMeasures)); } catch (e) {}
    if (savedSoundEnabled !== null) setSoundEnabledState(savedSoundEnabled === 'true');
  }, []);

  const setSoundEnabled = (enabled) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('soundEnabled', String(enabled));
  };

  // Función para sincronizar datos desde la nube
  const refreshData = async (force = false) => {
    if (!authUser || isSyncing) return;
    
    // EVITAR REVERTIR SI ACABAMOS DE ACTUALIZAR LOCALMENTE
    // Si hubo una actualización local hace menos de 5 segundos, 
    // ignoramos la carga automática de la nube (a menos que sea forzada)
    const now = Date.now();
    if (!force && (now - lastLocalUpdate.current < 5000)) {
      console.log("[UserContext] Ignorando sincronización automática para proteger cambios locales recientes");
      return;
    }

    setIsSyncing(true);
    try {
      console.log(`[UserContext] Sincronizando datos desde la nube (force: ${force})...`);
      const cloudData = await getFromCloud(`users/${authUser.uid}`);
      const publicData = await getFromCloud(`usersPublic/${authUser.uid}`);

      if (cloudData) {
        if (cloudData.profile) {
          setUser(cloudData.profile);
          localStorage.setItem('userProfile', JSON.stringify(cloudData.profile));
          
          // Asegurar que authUser también tenga la foto actualizada
          if (cloudData.profile.photoURL) {
            setAuthUser(prev => prev ? { ...prev, photoURL: cloudData.profile.photoURL } : prev);
          }
        }
        if (cloudData.completedWorkouts) {
          setCompletedWorkouts(cloudData.completedWorkouts);
          localStorage.setItem('completedWorkouts', JSON.stringify(cloudData.completedWorkouts));
        }
        if (cloudData.routines) {
          setRoutines(cloudData.routines);
          localStorage.setItem('routines', JSON.stringify(cloudData.routines));
        }
        if (cloudData.measures) {
          setMeasures(cloudData.measures);
          localStorage.setItem('measures', JSON.stringify(cloudData.measures));
        }
        if (cloudData.activeRoutine) {
          setActiveRoutine(cloudData.activeRoutine);
          localStorage.setItem('activeRoutine', JSON.stringify(cloudData.activeRoutine));
        }
        
        if (publicData && publicData.following) {
          setFollowing(publicData.following);
        } else if (cloudData.following) {
          setFollowing(cloudData.following);
        }

        const fList = await getFollowersList(authUser.uid);
        setFollowers(fList.map(u => u.id));

        if (cloudData.settings) {
          if (cloudData.settings.theme) {
            setTheme(cloudData.settings.theme);
            localStorage.setItem('theme', cloudData.settings.theme);
          }
          if (cloudData.settings.themePreference) {
            setThemePreferenceState(cloudData.settings.themePreference);
            localStorage.setItem('themePreference', cloudData.settings.themePreference);
          }
          if (cloudData.settings.language) {
            setLanguage(cloudData.settings.language);
            localStorage.setItem('language', cloudData.settings.language);
          }
        }
      }
    } catch (error) {
      console.error("[UserContext] Error al sincronizar con la nube:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Recoger el resultado de un signInWithRedirect pendiente (login con Google cuando el popup
  // falla: la página navega fuera y vuelve, así que el resultado solo se puede leer al
  // recargar). Esto se ejecuta en CADA carga de la app, haya habido o no un redirect pendiente
  // — por eso solo registramos el error en consola y nunca se lo mostramos al usuario: mostrar
  // una notificación aquí significaría que cualquier fallo interno de esta comprobación (sin
  // relación con un intento real de login) aparecería como error en cada visita a la web.
  // onAuthChange ya actualiza authUser en cuanto Firebase procesa el redirect correctamente.
  useEffect(() => {
    getGoogleRedirectResult().then((result) => {
      if (result && result.error) {
        console.error("Error en login (redirect):", result.error);
      }
    });
  }, []);

  // Suscribirse a cambios de autenticación de Firebase
  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      if (fbUser) {
        setAuthUser({
          uid: fbUser.uid,
          email: fbUser.email || null,
          displayName: fbUser.displayName || null,
          photoURL: fbUser.photoURL || null,
        });
        // La sincronización inicial se disparará cuando authUser cambie (ver useEffect abajo)
      } else {
        setAuthUser(null);
        setIsLoaded(true);
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Notificaciones sociales (like/comentario/nuevo seguidor) en vivo — onSnapshot en vez de un
  // fetch puntual para que el contador de no leídas se actualice solo, sin recargar ni navegar.
  useEffect(() => {
    if (!authUser) {
      setNotifications([]);
      return;
    }
    const unsub = subscribeToNotifications(authUser.uid, setNotifications);
    return () => unsub();
  }, [authUser]);

  const markNotificationsAsRead = async (notificationIds) => {
    if (!authUser || !notificationIds || notificationIds.length === 0) return;
    // Optimista: el badge baja al instante en vez de esperar a que el onSnapshot confirme la
    // escritura.
    setNotifications((prev) => prev.map((n) => (notificationIds.includes(n.id) ? { ...n, read: true } : n)));
    await markNotificationsReadInCloud(authUser.uid, notificationIds);
  };

  // Sincronización automática cuando el usuario se detecta por primera vez, o cuando cambia a
  // una cuenta distinta (p.ej. "cambiar cuenta" en ajustes) sin pasar por un logout completo.
  // isLoaded es un simple flag de "listo para renderizar" que una vez a true nunca vuelve a
  // false por sí solo — usar solo `!isLoaded` como guarda hacía que cambiar de cuenta se
  // quedara con los datos (vacíos o de la cuenta anterior) para siempre, porque refreshData
  // nunca se volvía a disparar para el nuevo uid.
  const loadedUidRef = useRef(null);
  useEffect(() => {
    if (!authUser) return;
    if (loadedUidRef.current === authUser.uid) return;
    if (loadedUidRef.current !== null) {
      // Cambiando de una cuenta a otra ya autenticada: limpia los datos de la anterior para
      // no mostrarlos mezclados mientras cargan los de la nueva.
      clearUser();
    }
    loadedUidRef.current = authUser.uid;
    setIsLoaded(false);
    refreshData(true).then(() => setIsLoaded(true));
  }, [authUser]);

  const saveUser = async (userData) => {
    // 1. Actualizar estado local inmediatamente para rapidez de UI
    setUser(userData);
    localStorage.setItem('userProfile', JSON.stringify(userData));
    lastLocalUpdate.current = Date.now();
    
    if (authUser) {
      if (userData?.photoURL) {
        setAuthUser((prev) => (prev ? { ...prev, photoURL: userData.photoURL } : prev));
      }

      // 2. Ejecutar guardados en la nube en paralelo (sin bloquear si no es necesario)
      // Pero devolvemos la promesa para que el llamador decida si esperar
      const savePromise = (async () => {
        try {
          const privateSave = saveToCloud(`users/${authUser.uid}`, { profile: userData });
          
          let publicSave = Promise.resolve();
          if (userData.username) {
            publicSave = saveToCloud(`usersPublic/${authUser.uid}`, {
              username: userData.username,
              usernameLowercase: userData.username.toLowerCase(),
              firstName: userData.firstName || "",
              photoURL: userData.photoURL || authUser.photoURL,
              photoScale: userData.photoScale || 1,
              photoPosX: userData.photoPosX || 0,
              photoPosY: userData.photoPosY || 0,
              description: userData.description || "",
              uid: authUser.uid,
              following: following
            });
          }

          await Promise.all([privateSave, publicSave]);
          console.log("[UserContext] Datos sincronizados con la nube correctamente");
        } catch (e) {
          console.error("Error persistiendo datos en la nube:", e);
          // No lanzamos error aquí para no romper la experiencia local,
          // pero podrías mostrar una notificación de "Error al sincronizar"
        }
      })();
      
      return savePromise;
    }
  };

  const clearUser = () => {
    setUser(null);
    localStorage.removeItem('userProfile');
    localStorage.removeItem('completedWorkouts');
    localStorage.removeItem('routines');
    localStorage.removeItem('measures');
    localStorage.removeItem('activeRoutine');
    setCompletedWorkouts([]);
    setRoutines([]);
    setMeasures([]);
    setActiveRoutine(null);
    setFollowing([]);
    setFollowers([]);
    setNotifications([]);
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loginWithGoogle = async () => {
    setIsLoggingIn(true);
    try {
      const result = await signInWithGoogle();
      if (result === 'cancelled') {
        // Ignorar silenciosamente si el usuario canceló
        return;
      }
      if (result && result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error("Error en login:", error);
      let errorMsg = "Ocurrió un error al iniciar sesión";
      
      // Mapear errores de Firebase
      if (error.code === 'auth/popup-blocked') {
        errorMsg = "El navegador bloqueó la ventana de inicio de sesión. Por favor, permite los popups.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMsg = "Error de red. Revisa tu conexión a internet.";
      } else if (error.code === 'auth/internal-error') {
        errorMsg = "Error interno de Firebase. Inténtalo de nuevo.";
      } else if (error.message) {
        errorMsg = `Error: ${error.message}`;
      }
      
      showNotification(errorMsg, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
    } finally {
      clearUser();
      setAuthUser(null);
    }
  };

  // 'system' resuelve el tema real vía prefers-color-scheme y se mantiene sincronizado en vivo.
  useEffect(() => {
    if (themePreference !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = (e) => {
      const resolved = e.matches ? 'dark' : 'light';
      setTheme(resolved);
      localStorage.setItem('theme', resolved);
    };
    applySystemTheme(mq);
    mq.addEventListener('change', applySystemTheme);
    return () => mq.removeEventListener('change', applySystemTheme);
  }, [themePreference]);

  const setThemeMode = async (mode) => {
    setThemePreferenceState(mode);
    localStorage.setItem('themePreference', mode);

    const resolved = mode === 'system'
      ? (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    setTheme(resolved);
    localStorage.setItem('theme', resolved);

    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { settings: { theme: resolved, themePreference: mode, language } });
    }
  };

  const updateLanguage = async (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { settings: { theme, language: newLang } });
    }
  };

  const saveCompletedWorkout = async (workout) => {
    lastLocalUpdate.current = Date.now();
    const newList = [workout, ...completedWorkouts];
    setCompletedWorkouts(newList);
    localStorage.setItem('completedWorkouts', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { completedWorkouts: newList });
      // Guardar también en colección global para el feed (público por defecto). El id del
      // documento lleva el uid delante (ver getPublicWorkoutDocId): el id local (Date.now())
      // no tiene nada que lo distinga por usuario, así que sin el prefijo dos cuentas podrían
      // generar el mismo id de documento y pisarse entre sí.
      await saveToCloud(`workouts/${getPublicWorkoutDocId(authUser.uid, workout.id)}`, {
        ...workout,
        userId: authUser.uid,
        userName: user?.username || authUser.displayName,
        userPhoto: user?.photoURL || authUser.photoURL,
        likes: [],
        commentsList: [],
        isPublic: true
      });
    }
  };

  const bulkSaveWorkouts = async (workouts) => {
    lastLocalUpdate.current = Date.now();
    const newList = [...workouts, ...completedWorkouts];
    // Sort by date descending
    newList.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    setCompletedWorkouts(newList);
    localStorage.setItem('completedWorkouts', JSON.stringify(newList));

    if (authUser) {
      try {
        // Publica en batches atómicos en vez de un setDoc por entrenamiento: con cientos de
        // entrenos importados de golpe, cientos de escrituras concurrentes son poco fiables
        // (compiten por conexión, se cortan si el usuario navega justo tras "importación
        // completada"). Ver bulkSaveWorkoutsToCloud en lib/firebase.js.
        await bulkSaveWorkoutsToCloud(
          authUser.uid,
          workouts,
          { userName: user?.username || authUser.displayName, userPhoto: user?.photoURL || authUser.photoURL },
          newList
        );
      } catch (error) {
        console.error('[bulkSaveWorkouts] Fallo al guardar en la nube:', error);
      }
    }
  };

  const bulkSaveMeasures = async (newMeasures) => {
    lastLocalUpdate.current = Date.now();
    setMeasures(newMeasures);
    localStorage.setItem('measures', JSON.stringify(newMeasures));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { measures: newMeasures });
    }
  };

  const deleteCompletedWorkout = async (id) => {
    lastLocalUpdate.current = Date.now();
    const newList = completedWorkouts.filter(w => w.id !== id);
    setCompletedWorkouts(newList);
    localStorage.setItem('completedWorkouts', JSON.stringify(newList));
    if (authUser) {
      // En paralelo, no en serie: encadenar awaits seguidos aumenta la latencia percibida por
      // quien pulsa "Borrar" (el modal de confirmación no se cierra hasta que esta función
      // termina — ver handleDeleteWorkout en pages/profile.js).
      const results = await Promise.allSettled([
        saveToCloud(`users/${authUser.uid}`, { completedWorkouts: newList }),
        // Sin esto, la copia pública en `workouts/{...}` (la que lee el feed y los perfiles de
        // otros usuarios, con o sin cuenta) nunca se borraba: el entrenamiento seguía visible
        // para todos aunque tú ya lo hubieras eliminado.
        deleteFromCloud(`workouts/${getPublicWorkoutDocId(authUser.uid, id)}`),
      ]);
      results.forEach((r) => {
        if (r.status === 'rejected') {
          console.error('[deleteCompletedWorkout] Fallo al borrar en la nube:', r.reason);
        }
      });
    }
  };

  const deleteAllWorkouts = async () => {
    lastLocalUpdate.current = Date.now();
    setCompletedWorkouts([]);
    localStorage.setItem('completedWorkouts', JSON.stringify([]));
    if (authUser) {
      // deleteAllPublicWorkoutsForUser busca en Firestore por userId en vez de reconstruir ids
      // desde el estado local: así se limpian también los documentos que pudieran haber
      // quedado con esquemas de id de versiones anteriores, no solo los que el cliente conoce.
      const results = await Promise.allSettled([
        saveToCloud(`users/${authUser.uid}`, { completedWorkouts: [] }),
        deleteAllPublicWorkoutsForUser(authUser.uid),
      ]);
      results.forEach((r) => {
        if (r.status === 'rejected') {
          console.error('[deleteAllWorkouts] Fallo al borrar del feed público:', r.reason);
        }
      });
    }
  };

  const updateCompletedWorkout = async (updatedWorkout) => {
    lastLocalUpdate.current = Date.now();
    const newList = completedWorkouts.map(w => w.id === updatedWorkout.id ? updatedWorkout : w);
    setCompletedWorkouts(newList);
    localStorage.setItem('completedWorkouts', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { completedWorkouts: newList });
      await saveToCloud(`workouts/${getPublicWorkoutDocId(authUser.uid, updatedWorkout.id)}`, updatedWorkout);
    }
  };

  const saveRoutine = async (newRoutine) => {
    lastLocalUpdate.current = Date.now();
    const newList = [newRoutine, ...routines];
    setRoutines(newList);
    localStorage.setItem('routines', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { routines: newList });
    }
  };

  const updateRoutine = async (updatedRoutine) => {
    lastLocalUpdate.current = Date.now();
    const newList = routines.map(r => r.id === updatedRoutine.id ? updatedRoutine : r);
    setRoutines(newList);
    localStorage.setItem('routines', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { routines: newList });
    }
  };

  const deleteRoutine = async (id) => {
    lastLocalUpdate.current = Date.now();
    const newList = routines.filter(r => r.id !== id);
    setRoutines(newList);
    localStorage.setItem('routines', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { routines: newList });
    }
  };
  
  const saveMeasures = async (newMeasures) => {
    lastLocalUpdate.current = Date.now();
    setMeasures(newMeasures);
    localStorage.setItem('measures', JSON.stringify(newMeasures));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { measures: newMeasures });
    }
  };

  const startRoutine = async (routineData) => {
    lastLocalUpdate.current = Date.now();
    setActiveRoutine(routineData);
    localStorage.setItem('activeRoutine', JSON.stringify(routineData));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { activeRoutine: routineData });
    }
  };

  const endRoutine = async () => {
    lastLocalUpdate.current = Date.now();
    setActiveRoutine(null);
    localStorage.removeItem('activeRoutine');
    localStorage.removeItem('workoutTimerState');
    localStorage.removeItem('workoutTimerLastSave');
    clearWorkoutSessionSnapshot();
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { activeRoutine: null });
    }
  };

  const clearWorkoutState = () => {
    localStorage.removeItem('workoutTimerState');
    localStorage.removeItem('workoutTimerLastSave');
    clearWorkoutSessionSnapshot();
  };

  const handleFollow = async (targetId) => {
    if (!authUser) return;
    await followUser(authUser.uid, targetId, {
      name: user?.username || authUser.displayName || 'Alguien',
      photo: user?.photoURL || authUser.photoURL || null,
    });
    setFollowing(prev => [...prev, targetId]);
  };

  const handleUnfollow = async (targetId) => {
    if (!authUser) return;
    await unfollowUser(authUser.uid, targetId);
    setFollowing(prev => prev.filter(id => id !== targetId));
  };

  return (
    <UserContext.Provider value={{ 
      user,
      authUser,
      saveUser, 
      clearUser, 
      loginWithGoogle,
      isLoggingIn,
      logout,
      isLoaded, 
      isSyncing,
      refreshData,
      theme,
      themePreference,
      setThemeMode,
      language,
      updateLanguage,
      soundEnabled,
      setSoundEnabled,
      activeRoutine,
      startRoutine,
      endRoutine,
      clearWorkoutState,
      completedWorkouts,
      saveCompletedWorkout,
      bulkSaveWorkouts,
      bulkSaveMeasures,
      deleteCompletedWorkout,
      deleteAllWorkouts,
      updateCompletedWorkout,
      routines,
      saveRoutine,
      updateRoutine,
      deleteRoutine,
      measures,
      saveMeasures,
      following,
      followers,
      isMobile,
      handleFollow,
      handleUnfollow,
      notifications,
      unreadNotificationsCount,
      markNotificationsAsRead,
      notification,
      showNotification,
      t
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
