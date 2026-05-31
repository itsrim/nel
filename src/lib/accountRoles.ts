import type { User } from "../store/useAuthStore";

/** Comptes staff / démo avec accès au mode admin. */
const ADMIN_EMAILS = new Set(["admin@yo.com", "demo@nel.com"]);

export function isDemoAccount(user: User | null | undefined): boolean {
  const email = user?.email?.trim().toLowerCase();
  return email === "demo@nel.com";
}

export function isAdminAccount(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  const email = user.email?.trim().toLowerCase();
  return email != null && ADMIN_EMAILS.has(email);
}
