import type { User } from "../store/useAuthStore";

/** Comptes staff / démo avec accès au mode admin. */
const ADMIN_EMAILS = new Set(["admin@yo.com", "admin@rim.com", "rim"]);
export const ADMIN_USER_ID = "user_admin_001";
const ADMIN_USER_IDS = new Set([ADMIN_USER_ID, "user_admin_000"]);

export function isDemoAccount(user: User | null | undefined): boolean {
  const email = user?.email?.trim().toLowerCase();
  return email === "admin@rim.com";
}

export function isAdminAccount(
  user: Pick<User, "id" | "email"> & { isAdmin?: boolean } | null | undefined,
): boolean {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  const id = user.id?.trim();
  if (id != null && ADMIN_USER_IDS.has(id)) return true;
  const email = user.email?.trim().toLowerCase();
  return email != null && ADMIN_EMAILS.has(email);
}

/** Profils staff / admin exclus de l'annuaire suggestions public. */
export function shouldExcludeFromPublicCatalog(
  profilId: string | undefined | null,
  email?: string | null,
): boolean {
  const id = profilId?.trim();
  if (!id) return false;
  return isAdminAccount({ id, email: email ?? undefined });
}

/** Édition des badges (profil connecté ou autre utilisateur) — compte staff + mode admin actif. */
export function canManageProfileBadges(
  user: User | null | undefined,
  isAdminMode: boolean,
): boolean {
  return isAdminAccount(user) && isAdminMode;
}
