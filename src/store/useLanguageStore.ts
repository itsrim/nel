import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LanguageKey } from '../i18n/translations';

interface LanguageStore {
  language: LanguageKey;
  setLanguage: (language: LanguageKey) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'fr' as LanguageKey,
      setLanguage: (language: LanguageKey) => set({ language }),
    }),
    {
      name: 'language-store',
    }
  )
);
