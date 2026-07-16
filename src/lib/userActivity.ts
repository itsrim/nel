import { isAdminAccount } from "./accountRoles";
import { numFromSheet } from "./sheetRowCodec";

/** Inactivité : pas de connexion depuis 2 mois (~60 jours). */
export const USER_INACTIVE_THRESHOLD_MS = 60 * 24 * 60 * 60 * 1000;

export function parseLastLoginAt(
  row: Record<string, string> | undefined | null,
): number | null {
  const raw = row?.lastLoginAt?.trim();
  if (!raw) return null;
  const n = numFromSheet(raw, 0);
  return n > 0 ? n : null;
}

export function isUserRecentlyActive(lastLoginAt: number | null): boolean {
  if (lastLoginAt == null) return true;
  return Date.now() - lastLoginAt <= USER_INACTIVE_THRESHOLD_MS;
}

export function canNotifyInactiveUser(
  recipientLastLoginAt: number | null,
  sender?: { id?: string | null; email?: string | null; isAdmin?: boolean } | null,
): boolean {
  if (sender && isAdminAccount(sender)) return true;
  return isUserRecentlyActive(recipientLastLoginAt);
}
