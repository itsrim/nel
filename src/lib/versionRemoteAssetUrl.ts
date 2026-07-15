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

/** Retire un éventuel paramètre `v` (cache-bust) avant réutilisation de l’URL. */
export function stripUrlUploadVersion(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u);
      parsed.searchParams.delete('v');
      return parsed.toString();
    } catch {
      return u;
    }
  }
  const q = u.indexOf('?');
  if (q < 0) return u;
  const base = u.slice(0, q);
  const params = new URLSearchParams(u.slice(q + 1));
  params.delete('v');
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

/** Force le navigateur à recharger une ressource distante (ex. à chaque connexion). */
export function refreshRemoteAssetUrlForDisplay(url: string): string {
  return withUrlUploadVersion(stripUrlUploadVersion(url));
}
