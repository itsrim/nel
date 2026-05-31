export type SubscriptionPlan = "premium" | "pro";

/** Durée d'un cycle mensuel simulé. */
export const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function nextSubscriptionEnd(from = Date.now()): number {
  return from + SUBSCRIPTION_PERIOD_MS;
}

export function isSubscriptionStillValid(
  expiresAt: number | null | undefined,
): boolean {
  return typeof expiresAt === "number" && expiresAt > Date.now();
}

export function formatSubscriptionEnd(
  expiresAt: number,
  locale = "fr-FR",
): string {
  const raw = new Date(expiresAt).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function readStoredTimestamp(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw?.trim()) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeStoredTimestamp(key: string, value: number | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}
