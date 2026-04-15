/**
 * Même fichier sur le CDN (ex. ImageKit `overwriteFile`) → souvent la même URL de réponse.
 * Le navigateur peut alors ne pas recharger. On ajoute un paramètre unique à chaque succès
 * d’upload pour que l’URI affichée change toujours.
 */
export function withUrlUploadVersion(url: string): string {
  const u = url.trim();
  if (!u) return u;
  const v = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const sep = u.includes('?') ? '&' : '?';
  return `${u}${sep}v=${encodeURIComponent(v)}`;
}
