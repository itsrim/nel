/**
 * Couvertures par défaut (thèmes / hashtags) — fichiers dans `public/event-cover-themes/`
 * (plus de requête réseau vers Unsplash à chaque affichage).
 */
export type DefaultEventCoverTheme = {
  id: string;
  /** Texte du hashtag sans # */
  tag: string;
  imageUrl: string;
};

/** Préfixe Vite (`base`, ex. `/nel/`) pour les fichiers dans `public/`. */
const coverPath = (file: string) => `${import.meta.env.BASE_URL}event-cover-themes/${file}`;

export const DEFAULT_EVENT_COVER_THEMES: DefaultEventCoverTheme[] = [
  { id: 'bien-etre', tag: 'bien-être', imageUrl: coverPath('bien-etre.jpg') },
  { id: 'forme', tag: 'forme', imageUrl: coverPath('forme.jpg') },
  { id: 'dev-personnel', tag: 'dév personnel', imageUrl: coverPath('dev-personnel.jpg') },
  { id: 'nature', tag: 'nature', imageUrl: coverPath('nature.jpg') },
  { id: 'partage', tag: 'partage', imageUrl: coverPath('partage.jpg') },
  { id: 'musique', tag: 'musique', imageUrl: coverPath('musique.jpg') },
  { id: 'travail', tag: 'travail', imageUrl: coverPath('travail.jpg') },
  { id: 'sortie', tag: 'sortie', imageUrl: coverPath('sortie.jpg') },
  { id: 'autres', tag: 'autres', imageUrl: coverPath('autres.jpg') },
];

/** Compare chemins absolus ou relatifs (ex. même fichier servi sous autre origine). */
function coverImagePathKey(url: string): string {
  const stripped = url.split('?')[0];
  try {
    if (stripped.startsWith('http://') || stripped.startsWith('https://')) {
      return new URL(stripped).pathname;
    }
  } catch {
    /* ignore */
  }
  return stripped;
}

export function findDefaultCoverThemeByImageUrl(imageUrl: string): DefaultEventCoverTheme | undefined {
  const key = coverImagePathKey(imageUrl);
  return DEFAULT_EVENT_COVER_THEMES.find((t) => coverImagePathKey(t.imageUrl) === key);
}
