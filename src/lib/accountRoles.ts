import type { User } from "../store/useAuthStore";

/** Comptes staff / démo avec accès au mode admin. */
const ADMIN_EMAILS = new Set(["admin@yo.com", "demo@nel.com", "rim"]);
const ADMIN_USER_IDS = new Set(["user_admin_001"]);

export function isDemoAccount(user: User | null | undefined): boolean {
  const email = user?.email?.trim().toLowerCase();
  return email === "demo@nel.com";
}

export function isAdminAccount(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  const id = user.id?.trim();
  if (id != null && ADMIN_USER_IDS.has(id)) return true;
  const email = user.email?.trim().toLowerCase();
  return email != null && ADMIN_EMAILS.has(email);
}
