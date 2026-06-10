/** Avatar par défaut (`public/event-cover-themes/avatar.jpg`) avec préfixe Vite `base`. */
export const DEFAULT_AVATAR_URL = `${import.meta.env.BASE_URL}event-cover-themes/avatar.jpg`;

/** Corrige les chemins relatifs (`/event-cover-themes/...`) avec le préfixe Vite `base`. */
export function resolveAvatarUrl(url?: string | null): string {
  const raw = url?.trim();
  if (!raw) return DEFAULT_AVATAR_URL;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const base = import.meta.env.BASE_URL;
  if (raw.startsWith(base)) return raw;
  const path = raw.startsWith("/") ? raw.slice(1) : raw;
  return `${base}${path}`;
}
