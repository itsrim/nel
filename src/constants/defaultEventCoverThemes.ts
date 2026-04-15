/**
 * Couvertures par défaut (thèmes / hashtags) — URLs stables Unsplash pour la création de sortie nel.
 */
export type DefaultEventCoverTheme = {
  id: string;
  /** Texte du hashtag sans # */
  tag: string;
  imageUrl: string;
};

const u = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?w=800&q=80&auto=format&fit=crop`;

export const DEFAULT_EVENT_COVER_THEMES: DefaultEventCoverTheme[] = [
  { id: 'bien-etre', tag: 'bien-être', imageUrl: u('photo-1506126613408-eca07ce68773') },
  { id: 'forme', tag: 'forme', imageUrl: u('photo-1517836357463-d25dfeac3438') },
  { id: 'dev-personnel', tag: 'dév personnel', imageUrl: u('photo-1503676260728-1c00da094a0b') },
  { id: 'nature', tag: 'nature', imageUrl: u('photo-1441974231531-c6227db76b6e') },
  { id: 'partage', tag: 'partage', imageUrl: u('photo-1529156069898-49953e39b3ac') },
  { id: 'musique', tag: 'musique', imageUrl: u('photo-1511379938547-c1f69419868d') },
  { id: 'travail', tag: 'travail', imageUrl: u('photo-1497366216548-37526070297c') },
  { id: 'sortie', tag: 'sortie', imageUrl: u('photo-1514525253161-7a46d19cd819') },
  { id: 'autres', tag: 'autres', imageUrl: u('photo-1506905925346-21bda4d32df4') },
];

export function findDefaultCoverThemeByImageUrl(imageUrl: string): DefaultEventCoverTheme | undefined {
  const base = imageUrl.split('?')[0];
  return DEFAULT_EVENT_COVER_THEMES.find((t) => t.imageUrl.split('?')[0] === base);
}
