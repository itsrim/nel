import {
  isViewerPremiumSubscriptionActive,
  isViewerProSubscriptionActive,
  type ViewerEntitlementState,
} from "./viewerEntitlements";

/** Parse une clé `YYYY-MM-DD` en date locale (midi pour éviter les décalages fuseau). */
export function parseDateKeyLocal(dateKey: string): Date {
  const p = dateKey.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

/** Clé locale `YYYY-MM-DD` à partir d'une `Date`. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Clé du jour calendaire local (aujourd'hui). */
export function todayDateKey(): string {
  return toDateKey(new Date());
}

/** Limite quotidienne de demandes d'ami (compte classique). */
export const FRIEND_REQUEST_DAILY_LIMIT = 1;

/** Limite quotidienne de demandes d'ami (compte Premium). */
export const FRIEND_REQUEST_DAILY_LIMIT_PREMIUM = 5;

/** Limite quotidienne de demandes d'ami (compte Pro / professionnel). */
export const FRIEND_REQUEST_DAILY_LIMIT_PRO = 10;

/**
 * Champ persisté `friendRequestDailySentDateKey` :
 * - `YYYY-MM-DD` → 1 envoi ce jour (legacy)
 * - `YYYY-MM-DD#N` → N envois ce jour
 */
export function parseDailyFriendRequestSent(
  stored: string | null | undefined,
): { dateKey: string | null; count: number } {
  const raw = stored?.trim() ?? "";
  if (!raw) return { dateKey: null, count: 0 };
  const hash = raw.indexOf("#");
  const dateKey = (hash >= 0 ? raw.slice(0, hash) : raw).trim() || null;
  if (!dateKey || dateKey !== todayDateKey()) {
    return { dateKey, count: 0 };
  }
  if (hash < 0) return { dateKey, count: 1 };
  const n = parseInt(raw.slice(hash + 1), 10);
  return {
    dateKey,
    count: Number.isFinite(n) && n > 0 ? n : 1,
  };
}

export function formatDailyFriendRequestSent(
  dateKey: string,
  count: number,
): string {
  const n = Math.max(1, Math.floor(count));
  return n <= 1 ? dateKey : `${dateKey}#${n}`;
}

/**
 * Limite quotidienne selon l’abonnement.
 * `null` = aucune limite (admin).
 */
export function dailyFriendRequestLimitForViewer(
  state: ViewerEntitlementState,
): number | null {
  if (state.isAdmin) return null;
  if (isViewerProSubscriptionActive(state)) {
    return FRIEND_REQUEST_DAILY_LIMIT_PRO;
  }
  if (isViewerPremiumSubscriptionActive(state)) {
    return FRIEND_REQUEST_DAILY_LIMIT_PREMIUM;
  }
  return FRIEND_REQUEST_DAILY_LIMIT;
}

/** Clé i18n pour le libellé de limite quotidienne (null si admin / illimité). */
export function friendRequestDailyLimitTranslationKey(
  state: ViewerEntitlementState,
):
  | "friendRequestDailyLimit"
  | "friendRequestDailyLimitPremium"
  | "friendRequestDailyLimitPro"
  | null {
  const limit = dailyFriendRequestLimitForViewer(state);
  if (limit == null) return null;
  if (limit >= FRIEND_REQUEST_DAILY_LIMIT_PRO) return "friendRequestDailyLimitPro";
  if (limit >= FRIEND_REQUEST_DAILY_LIMIT_PREMIUM) {
    return "friendRequestDailyLimitPremium";
  }
  return "friendRequestDailyLimit";
}

/** Vrai si la limite quotidienne de demandes d'ami est atteinte. */
export function hasReachedDailyFriendRequestLimit(
  lastSentStored: string | null | undefined,
  state: ViewerEntitlementState,
): boolean {
  const limit = dailyFriendRequestLimitForViewer(state);
  if (limit == null) return false;
  const { count } = parseDailyFriendRequestSent(lastSentStored);
  return count >= limit;
}

/** Incrémente le compteur du jour (à persister dans `friendRequestDailySentDateKey`). */
export function nextDailyFriendRequestSentState(
  lastSentStored: string | null | undefined,
): string {
  const today = todayDateKey();
  const { count } = parseDailyFriendRequestSent(lastSentStored);
  return formatDailyFriendRequestSent(today, count + 1);
}

/** Vrai si le jour de l’événement (calendrier local) est strictement avant aujourd’hui. */
export function isEventDateBeforeToday(dateKey: string): boolean {
  const d = parseDateKeyLocal(dateKey);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return eventStart < todayStart;
}

/** Libellé de section agenda unifié (un jour = une ligne, quel que soit `sectionDateLabel` en base). */
export function formatEventSectionTitle(dateKey: string): string {
  const d = parseDateKeyLocal(dateKey);
  const raw = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
