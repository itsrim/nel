import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeStore {
  isDarkMode: boolean;
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
}

export function applyThemeToDocument(isDarkMode: boolean): void {
  const theme = isDarkMode ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      isDarkMode: true,
      setDarkMode: (value) => {
        applyThemeToDocument(value);
        set({ isDarkMode: value });
      },
      toggleDarkMode: () => {
        const next = !get().isDarkMode;
        applyThemeToDocument(next);
        set({ isDarkMode: next });
      },
    }),
    {
      name: "theme-store",
      onRehydrateStorage: () => (state) => {
        applyThemeToDocument(state?.isDarkMode ?? true);
      },
    },
  ),
);

/** Applique le thème persisté avant le premier rendu React (évite un flash). */
export function initThemeFromStorage(): void {
  try {
    const raw = localStorage.getItem("theme-store");
    if (!raw) {
      applyThemeToDocument(true);
      return;
    }
    const parsed = JSON.parse(raw) as { state?: { isDarkMode?: boolean } };
    applyThemeToDocument(parsed.state?.isDarkMode !== false);
  } catch {
    applyThemeToDocument(true);
  }
}
