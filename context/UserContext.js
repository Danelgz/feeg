import React, { createContext, useState, useContext, useEffect } from 'react';
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
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('es');
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [completedWorkouts, setCompletedWorkouts] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

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

    // Suscribirse a cambios de autenticación de Firebase
    const unsub = onAuthChange(async (fbUser) => {
      if (fbUser) {
        setAuthUser({
          uid: fbUser.uid,
          email: fbUser.email || null,
          displayName: fbUser.displayName || null,
          photoURL: fbUser.photoURL || null,
        });

        setIsSyncing(true);
        // Intentar sincronizar datos desde la nube
        try {
          const cloudData = await getFromCloud(`users/${fbUser.uid}`);
          const publicData = await getFromCloud(`usersPublic/${fbUser.uid}`);
          
          if (cloudData) {
            // Si hay datos en la nube, mandan sobre los locales
            if (cloudData.profile) {
              setUser(cloudData.profile);
              localStorage.setItem('userProfile', JSON.stringify(cloudData.profile));
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
            
            // Following viene de usersPublic para ser consultable
            if (publicData && publicData.following) {
              setFollowing(publicData.following);
            } else if (cloudData.following) {
              setFollowing(cloudData.following); // Fallback migración
            }

            // Followers se calcula siempre
            const fCount = await getFollowersCount(fbUser.uid);
            // Si queremos la lista:
            const fList = await getFollowersList(fbUser.uid);
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
          } else {
            // Si NO hay datos en la nube pero sí locales, los subimos (migración)
            const savedUserLoc = localStorage.getItem('userProfile');
            if (savedUserLoc) {
              const localProfile = JSON.parse(savedUserLoc);
              await saveToCloud(`users/${fbUser.uid}`, { 
                profile: localProfile,
                completedWorkouts: JSON.parse(localStorage.getItem('completedWorkouts') || '[]'),
                routines: JSON.parse(localStorage.getItem('routines') || '[]'),
                measures: JSON.parse(localStorage.getItem('measures') || '[]')
              });
            }
          }
        } catch (error) {
          console.error("Error synchronizing cloud data:", error);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setAuthUser(null);
      }
      setIsLoaded(true);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const saveUser = async (userData) => {
    setUser(userData);
    localStorage.setItem('userProfile', JSON.stringify(userData));
    if (authUser) {
      // Guardar datos privados
      await saveToCloud(`users/${authUser.uid}`, { profile: userData });
      // Guardar datos públicos con usernameLowercase para búsqueda eficiente
      await saveToCloud(`usersPublic/${authUser.uid}`, {
        username: userData.username,
        usernameLowercase: userData.username.toLowerCase(),
        firstName: userData.firstName,
        photoURL: userData.photoURL || authUser.photoURL,
        description: userData.description || "",
        uid: authUser.uid,
        following: following
      });
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
      await signInWithGoogle();
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

  const deleteCompletedWorkout = async (id) => {
    const newList = completedWorkouts.filter(w => w.id !== id);
    setCompletedWorkouts(newList);
    localStorage.setItem('completedWorkouts', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { completedWorkouts: newList });
    }
  };

  const updateCompletedWorkout = async (updatedWorkout) => {
    const newList = completedWorkouts.map(w => w.id === updatedWorkout.id ? updatedWorkout : w);
    setCompletedWorkouts(newList);
    localStorage.setItem('completedWorkouts', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { completedWorkouts: newList });
      await saveToCloud(`workouts/${updatedWorkout.id}`, updatedWorkout);
    }
  };

  const saveRoutine = async (newRoutine) => {
    const newList = [newRoutine, ...routines];
    setRoutines(newList);
    localStorage.setItem('routines', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { routines: newList });
    }
  };

  const updateRoutine = async (updatedRoutine) => {
    const newList = routines.map(r => r.id === updatedRoutine.id ? updatedRoutine : r);
    setRoutines(newList);
    localStorage.setItem('routines', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { routines: newList });
    }
  };

  const deleteRoutine = async (id) => {
    const newList = routines.filter(r => r.id !== id);
    setRoutines(newList);
    localStorage.setItem('routines', JSON.stringify(newList));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { routines: newList });
    }
  };
  
  const saveMeasures = async (newMeasures) => {
    setMeasures(newMeasures);
    localStorage.setItem('measures', JSON.stringify(newMeasures));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { measures: newMeasures });
    }
  };

  const startRoutine = async (routineData) => {
    setActiveRoutine(routineData);
    localStorage.setItem('activeRoutine', JSON.stringify(routineData));
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { activeRoutine: routineData });
    }
  };

  const endRoutine = async () => {
    setActiveRoutine(null);
    localStorage.removeItem('activeRoutine');
    if (authUser) {
      await saveToCloud(`users/${authUser.uid}`, { activeRoutine: null });
    }
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
      theme, 
      toggleTheme, 
      language, 
      updateLanguage,
      activeRoutine,
      startRoutine,
      endRoutine,
      completedWorkouts,
      saveCompletedWorkout,
      deleteCompletedWorkout,
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
