/**
 * Hook pour gérer le thème clair/sombre
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'pylontech-dark-mode';

/**
 * Hook custom pour gérer le thème de l'application
 * @returns {Object} { isDarkMode, toggleTheme }
 */
export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Récupérer la préférence depuis localStorage ou utiliser la préférence système
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Appliquer le thème au document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTheme));
  };

  return { isDarkMode, toggleTheme };
};
