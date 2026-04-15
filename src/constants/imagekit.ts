/** URL de livraison (ImageKit ID = segment d’hôte). */
export const IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/xzy4sppt7g';

/** Clé publique ImageKit (upload côté client + signature avec clé privée en env). */
export const IMAGEKIT_PUBLIC_KEY = 'public_P8SHxtLXEslKtUwWs7gR+MAjBx0=';

export const IMAGEKIT_UPLOAD_FOLDER = '/profile-avatars';

function avatarExtensionForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('heic') || m.includes('heif')) return 'heic';
  return 'jpg';
}

/**
 * Nom de fichier par utilisateur : `{userKey}_avatar.{ext}` — stable pour un même compte
 * (écrasement via `overwriteFile` dans `imagekitUpload.ts`).
 */
export function imageKitProfileAvatarFileName(userKey: string, mimeType?: string | null): string {
  const safe = userKey.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'user';
  const mime = (mimeType ?? '').trim() || 'image/jpeg';
  const ext = avatarExtensionForMime(mime);
  return `${safe}_avatar.${ext}`;
}
