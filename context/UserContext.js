import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { translations } from '../data/translations';
import { 
  onAuthChange, 
  signInWithGoogle, 
  signOutUser, 
  saveToCloud, 
  getFromCloud, 
  followUser, 
  unfollowUser, 
  getFollowersCount,
  getFollowersList,
  getFollowingList
} from '../lib/firebase';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null); // Perfil completado (datos adicionales)
  const [authUser, setAuthUser] = useState(null); // Usuario autenticado (Firebase)
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastLocalUpdate = useRef(0);
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('es');
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [completedWorkouts, setCompletedWorkouts] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    const savedLanguage = localStorage.getItem('language');
    const savedActiveRoutine = localStorage.getItem('activeRoutine');
    const savedWorkouts = localStorage.getItem('completedWorkouts');
    const savedRoutines = localStorage.getItem('routines');
    const savedMeasures = localStorage.getItem('measures');
    
    if (savedUser) try { setUser(JSON.parse(savedUser)); } catch (e) {}
    if (savedTheme) setTheme(savedTheme);
    if (savedLanguage) setLanguage(savedLanguage);
    if (savedActiveRoutine) try { setActiveRoutine(JSON.parse(savedActiveRoutine)); } catch (e) {}
    if (savedWorkouts) try { setCompletedWorkouts(JSON.parse(savedWorkouts)); } catch (e) {}
    if (savedRoutines) try { setRoutines(JSON.parse(savedRoutines)); } catch (e) {}
    if (savedMeasures) try { setMeasures(JSON.parse(savedMeasures)); } catch (e) {}
  }, []);

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

  // Sincronización automática cuando el usuario se detecta por primera vez
  useEffect(() => {
    if (authUser && !isLoaded) {
      refreshData(true).then(() => setIsLoaded(true));
    }
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

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { settings: { theme: newTheme, language } });
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
      // Guardar también en colección global para el feed
      await saveToCloud(`workouts/${workout.id}`, { 
        ...workout, 
        userId: authUser.uid,
        userName: user?.username || authUser.displayName,
        userPhoto: user?.photoURL || authUser.photoURL,
        likes: [],
        commentsList: []
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
      await saveToCloud(`users/${authUser.uid}`, { completedWorkouts: newList });
      
      // Save only the most recent workouts to global feed to avoid spamming/limits
      // Let's say last 10
      const recentWorkouts = workouts.slice(0, 10);
      const feedPromises = recentWorkouts.map(workout => 
        saveToCloud(`workouts/${workout.id}`, { 
          ...workout, 
          userId: authUser.uid,
          userName: user?.username || authUser.displayName,
          userPhoto: user?.photoURL || authUser.photoURL,
          likes: [],
          commentsList: []
        })
      );
      await Promise.all(feedPromises);
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
      await saveToCloud(`users/${authUser.uid}`, { completedWorkouts: newList });
    }
  };

  const deleteAllWorkouts = async () => {
    lastLocalUpdate.current = Date.now();
    setCompletedWorkouts([]);
    localStorage.setItem('completedWorkouts', JSON.stringify([]));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { completedWorkouts: [] });
    }
  };

  const updateCompletedWorkout = async (updatedWorkout) => {
    lastLocalUpdate.current = Date.now();
    const newList = completedWorkouts.map(w => w.id === updatedWorkout.id ? updatedWorkout : w);
    setCompletedWorkouts(newList);
    localStorage.setItem('completedWorkouts', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { completedWorkouts: newList });
      await saveToCloud(`workouts/${updatedWorkout.id}`, updatedWorkout);
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
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { activeRoutine: null });
    }
  };

  const clearWorkoutState = () => {
    localStorage.removeItem('workoutTimerState');
    localStorage.removeItem('workoutTimerLastSave');
  };

  const handleFollow = async (targetId) => {
    if (!authUser) return;
    await followUser(authUser.uid, targetId);
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
      toggleTheme, 
      language, 
      updateLanguage,
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
      notification,
      showNotification,
      isMenuOpen,
      setIsMenuOpen,
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
