import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../data/translations';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('es');

  // Función de traducción
  const t = (key) => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    // Cargar usuario, tema e idioma desde localStorage al montar
    const savedUser = localStorage.getItem('userProfile');
    const savedTheme = localStorage.getItem('theme');
    const savedLanguage = localStorage.getItem('language');
    
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
    
    setIsLoaded(true);
  }, []);

  const saveUser = (userData) => {
    setUser(userData);
    localStorage.setItem('userProfile', JSON.stringify(userData));
  };

  const clearUser = () => {
    setUser(null);
    localStorage.removeItem('userProfile');
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

  return (
    <UserContext.Provider value={{ 
      user, 
      saveUser, 
      clearUser, 
      isLoaded, 
      theme, 
      toggleTheme, 
      language, 
      updateLanguage,
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
