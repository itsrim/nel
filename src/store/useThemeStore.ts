import { create } from 'zustand';

interface ThemeStore {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => {
  // Charger depuis localStorage au démarrage
  const savedTheme = typeof window !== 'undefined' 
    ? localStorage.getItem('nel-theme') 
    : null;
  const initialDarkMode = savedTheme ? savedTheme === 'dark' : true;

  return {
    isDarkMode: initialDarkMode,
    toggleDarkMode: () => {
      set((state) => {
        const newDarkMode = !state.isDarkMode;
        if (typeof window !== 'undefined') {
          localStorage.setItem('nel-theme', newDarkMode ? 'dark' : 'light');
        }
        return { isDarkMode: newDarkMode };
      });
    },
  };
});
