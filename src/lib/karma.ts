/** Identifiant karma du profil connecté dans les listes de participants. */
export const VIEWER_KARMA_PARTICIPANT_ID = "__viewer__";

export const KARMA_DEFAULT = 5;
export const KARMA_ORGANIZE_COST = 3;
export const KARMA_ORGANIZE_MIN = 3;
export const KARMA_ORGANIZE_SUCCESS_REWARD = 6;
export const KARMA_JOIN_COST = 1;
export const KARMA_JOIN_MIN = 1;
export const KARMA_ATTENDANCE_REWARD = 2;
export const KARMA_PREMIUM_PER_MONTH = 50;

export function canAffordOrganize(karma: number, isPro: boolean): boolean {
  return isPro || karma >= KARMA_ORGANIZE_MIN;
}

export function canAffordJoin(karma: number, isPro: boolean): boolean {
  return isPro || karma >= KARMA_JOIN_MIN;
}

export function normalizeKarma(value: number): number {
  return Math.max(0, Math.round(value));
}
