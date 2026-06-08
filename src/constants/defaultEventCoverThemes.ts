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
  { id: 'formation', tag: 'formation', imageUrl: coverPath('formation.jpg') },
  { id: 'therapy', tag: 'therapy', imageUrl: coverPath('therapy.jpg') },
  { id: 'nature', tag: 'nature', imageUrl: coverPath('nature.jpg') },
  { id: 'partage', tag: 'partage', imageUrl: coverPath('partage.jpg') },
  { id: 'musique', tag: 'musique', imageUrl: coverPath('musique.jpg') },
  { id: 'travail', tag: 'travail', imageUrl: coverPath('travail.jpg') },
  { id: 'sortie', tag: 'sortie', imageUrl: coverPath('sortie.jpg') },
  { id: 'autres', tag: 'autres', imageUrl: coverPath('autres.jpg') },
];

/** Même ordre que les chips couverture (#bien-être … #autres) — filtre liste événements. */
export const EVENT_THEME_TAG_OPTIONS: readonly string[] = DEFAULT_EVENT_COVER_THEMES.map((t) => t.tag);

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

function foldThemeSearch(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Thème couverture d’une sortie (image par défaut ou hashtag dans titre / notes). */
export function resolveEventCoverTheme(event: {
  imageUri: string;
  title?: string;
  notes?: string;
}): DefaultEventCoverTheme | undefined {
  const fromImage = findDefaultCoverThemeByImageUrl(event.imageUri);
  if (fromImage) return fromImage;

  const hay = foldThemeSearch(`${event.title ?? ''} ${event.notes ?? ''}`);
  for (const theme of DEFAULT_EVENT_COVER_THEMES) {
    if (hay.includes(foldThemeSearch(theme.tag))) return theme;
  }
  return undefined;
}

export type EventThemeBadgeColors = { bg: string; fg: string };

/** Couleurs arc-en-ciel par thème (jaune réservé au badge Pro). */
const THEME_BADGE_COLORS: Record<string, EventThemeBadgeColors> = {
  'bien-être': { bg: '#C026D3', fg: '#FFFFFF' },
  forme: { bg: '#DC2626', fg: '#FFFFFF' },
  'dév personnel': { bg: '#EA580C', fg: '#FFFFFF' },
  formation: { bg: '#DB2777', fg: '#FFFFFF' },
  therapy: { bg: '#7C3AED', fg: '#FFFFFF' },
  nature: { bg: '#16A34A', fg: '#FFFFFF' },
  partage: { bg: '#0891B2', fg: '#FFFFFF' },
  musique: { bg: '#2563EB', fg: '#FFFFFF' },
  travail: { bg: '#4F46E5', fg: '#FFFFFF' },
  sortie: { bg: '#9333EA', fg: '#FFFFFF' },
  autres: { bg: '#475569', fg: '#FFFFFF' },
};

export function getEventThemeBadgeColors(tag: string): EventThemeBadgeColors {
  return THEME_BADGE_COLORS[tag] ?? { bg: '#64748B', fg: '#FFFFFF' };
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Styles chip filtre ou badge vignette. */
export function eventThemeChipStyle(
  tag: string,
  active: boolean,
): {
  backgroundColor: string;
  borderColor: string;
  color: string;
  boxShadow?: string;
} {
  const { bg, fg } = getEventThemeBadgeColors(tag);
  if (active) {
    return {
      backgroundColor: bg,
      borderColor: '#FFFFFF',
      color: fg,
      boxShadow: `0 0 0 2px ${hexToRgba(bg, 0.45)}`,
    };
  }
  return {
    backgroundColor: hexToRgba(bg, 0.72),
    borderColor: hexToRgba(bg, 0.95),
    color: fg,
  };
}
