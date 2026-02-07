import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../data/translations';
import { onAuthChange, signInWithGoogle, signOutUser } from '../lib/firebase';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null); // Perfil completado (datos adicionales)
  const [authUser, setAuthUser] = useState(null); // Usuario autenticado (Firebase)
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('es');
  const [activeRoutine, setActiveRoutine] = useState(null);

  // Función de traducción
  const t = (key) => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    // Cargar usuario, tema e idioma desde localStorage al montar
    const savedUser = localStorage.getItem('userProfile');
    const savedTheme = localStorage.getItem('theme');
    const savedLanguage = localStorage.getItem('language');
    const savedActiveRoutine = localStorage.getItem('activeRoutine');
    
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing saved user:', e);
      }
    }
    
    if (savedTheme) {
      setTheme(savedTheme);
    }

    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    if (savedActiveRoutine) {
      try {
        setActiveRoutine(JSON.parse(savedActiveRoutine));
      } catch (e) {
        console.error('Error parsing saved active routine:', e);
      }
    }

    // Suscribirse a cambios de autenticación de Firebase
    const unsub = onAuthChange((fbUser) => {
      if (fbUser) {
        setAuthUser({
          uid: fbUser.uid,
          email: fbUser.email || null,
          displayName: fbUser.displayName || null,
          photoURL: fbUser.photoURL || null,
        });
      } else {
        setAuthUser(null);
      }
      setIsLoaded(true);
    });

    // En SSR no existe window, pero este efecto sólo corre en cliente
    // Establecer cargado aunque no haya autenticación
    setIsLoaded(true);

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const saveUser = (userData) => {
    setUser(userData);
    localStorage.setItem('userProfile', JSON.stringify(userData));
  };

  const clearUser = () => {
    setUser(null);
    localStorage.removeItem('userProfile');
  };

  const loginWithGoogle = async () => {
    await signInWithGoogle();
  };

  const logout = async () => {
    try {
      await signOutUser();
    } finally {
      clearUser();
      setAuthUser(null);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const updateLanguage = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const startRoutine = (routineData) => {
    setActiveRoutine(routineData);
    localStorage.setItem('activeRoutine', JSON.stringify(routineData));
  };

  const endRoutine = () => {
    setActiveRoutine(null);
    localStorage.removeItem('activeRoutine');
  };

  return (
    <UserContext.Provider value={{ 
      user,
      authUser,
      saveUser, 
      clearUser, 
      loginWithGoogle,
      logout,
      isLoaded, 
      theme, 
      toggleTheme, 
      language, 
      updateLanguage,
      activeRoutine,
      startRoutine,
      endRoutine,
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
