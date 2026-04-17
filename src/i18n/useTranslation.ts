import { useLanguageStore } from '../store/useLanguageStore';
import { translations, TranslationKey } from './translations';

export function useTranslation() {
  const { language } = useLanguageStore();

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.fr[key] || key;
  };

  return { t, language };
}
