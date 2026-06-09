/** Identifiant karma du profil connecté dans les listes de participants. */
export const VIEWER_KARMA_PARTICIPANT_ID = "__viewer__";

export const KARMA_DEFAULT = 5;
export const KARMA_ORGANIZE_COST = 3;
export const KARMA_ORGANIZE_SUCCESS_REWARD = 6;
export const KARMA_JOIN_COST = 1;
export const KARMA_ATTENDANCE_REWARD = 2;
export const KARMA_PREMIUM_PER_MONTH = 50;

export type OrganizerRatingValue = "good" | "bad";

export interface OrganizerRating {
  profilId: string;
  rating: OrganizerRatingValue;
}

export function normalizeKarma(value: number): number {
  return Math.round(value);
}

/** Participants présents validés, hors organisateur connecté. */
export function presentParticipantIds(validatedPresentProfilIds: string[]): string[] {
  return validatedPresentProfilIds.filter(
    (id) => id !== VIEWER_KARMA_PARTICIPANT_ID,
  );
}

export function countBadOrganizerRatings(
  presentIds: string[],
  ratings: OrganizerRating[],
): number {
  const present = new Set(presentIds);
  return ratings.filter((r) => present.has(r.profilId) && r.rating === "bad")
    .length;
}

/** Majorité des participants présents a noté l'organisateur négativement. */
export function isMajorityBadOrganizerRating(
  presentIds: string[],
  ratings: OrganizerRating[],
): boolean {
  if (presentIds.length === 0) return false;
  return countBadOrganizerRatings(presentIds, ratings) > presentIds.length / 2;
}

/** Le karma organisateur peut être calculé (fin de sortie ou tous ont noté). */
export function shouldFinalizeOrganizerKarma(
  presentIds: string[],
  ratings: OrganizerRating[],
  isPastEvent: boolean,
): boolean {
  if (presentIds.length === 0) return false;
  if (isMajorityBadOrganizerRating(presentIds, ratings)) return true;
  if (isPastEvent) return true;
  const present = new Set(presentIds);
  const ratedCount = ratings.filter((r) => present.has(r.profilId)).length;
  return ratedCount >= presentIds.length;
}

/** Au moins la moitié des places (participantMax) doivent être inscrites. */
export function meetsEnrollmentThresholdForOrganizerKarma(
  participantCount: number,
  participantMax: number,
): boolean {
  if (participantMax <= 0) return false;
  return participantCount >= participantMax / 2;
}

export function shouldAwardOrganizerKarma(
  presentIds: string[],
  ratings: OrganizerRating[],
  isPastEvent: boolean,
  alreadyRewarded: boolean,
  alreadyDenied: boolean,
  participantCount: number,
  participantMax: number,
): boolean {
  if (alreadyRewarded || alreadyDenied) return false;
  if (presentIds.length === 0) return false;
  if (!meetsEnrollmentThresholdForOrganizerKarma(participantCount, participantMax)) {
    return false;
  }
  if (!shouldFinalizeOrganizerKarma(presentIds, ratings, isPastEvent)) return false;
  return !isMajorityBadOrganizerRating(presentIds, ratings);
}
