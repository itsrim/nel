import type { Event } from "../data/mockData";
import { VIEWER_KARMA_PARTICIPANT_ID } from "./karma";

/** Sortie masquée de l'agenda public par l'organisateur (`isPrivate`). */
export function eventIsBlockedByOrganizer(e: Event): boolean {
  return e.isPrivate === true;
}

/** Le visiteur connecté participe (inscrit, liste d'attente, karma payé, etc.). */
export function viewerParticipatesInEvent(e: Event): boolean {
  if (e.hostedByViewer === true) return true;

  const pid = VIEWER_KARMA_PARTICIPANT_ID;
  if ((e.karmaJoinPaidProfilIds ?? []).includes(pid)) return true;
  if ((e.validatedPresentProfilIds ?? []).includes(pid)) return true;
  if ((e.waitlistEntries ?? []).some((w) => w.profilId === pid)) return true;

  // Legacy / session locale (statut viewer sur la fiche)
  if (e.status === "inscrit" || e.status === "en_attente") return true;

  return false;
}

/**
 * Catalogue sorties : toutes les sorties publiques ;
 * sorties privées (bloquées par l'organisateur) seulement si participant ou admin.
 */
export function eventIsVisibleInDiscovery(
  e: Event,
  isAdmin: boolean,
  moderationHiddenEventIds?: readonly string[],
  _currentUserName?: string,
): boolean {
  if (moderationHiddenEventIds?.includes(e.id)) return false;
  if (!eventIsBlockedByOrganizer(e)) return true;
  if (isAdmin) return true;
  return viewerParticipatesInEvent(e);
}
