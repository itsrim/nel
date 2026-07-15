import type { Event } from "../data/mockData";
import { VIEWER_KARMA_PARTICIPANT_ID } from "./karma";
import {
  eventHostedByViewer,
  eventOrganizerUserId,
  viewerIsRegisteredParticipant,
  type ViewerContext,
} from "./eventHost";
import { useAuthStore } from "../store/useAuthStore";

/** Sortie masquée de l'agenda public par l'organisateur (`isPrivate`). */
export function eventIsBlockedByOrganizer(e: Event): boolean {
  return e.isPrivate === true;
}

/** Le visiteur connecté participe (inscrit, liste d'attente, karma payé, etc.). */
export function viewerParticipatesInEvent(
  e: Event,
  viewer?: ViewerContext | null,
): boolean {
  if (eventHostedByViewer(e, viewer)) return true;
  if (viewerIsRegisteredParticipant(e, viewer)) return true;

  const viewerId = viewer?.id?.trim();
  if (!viewerId) {
    // Session locale sans compte : le placeholder __viewer__ = profil connecté.
    const pid = VIEWER_KARMA_PARTICIPANT_ID;
    if ((e.karmaJoinPaidProfilIds ?? []).includes(pid)) return true;
    if ((e.validatedPresentProfilIds ?? []).includes(pid)) return true;
    if ((e.waitlistEntries ?? []).some((w) => w.profilId === pid)) return true;
    if (e.status === "inscrit" || e.status === "en_attente") return true;
    return false;
  }

  // Catalogue Sheets partagé : uniquement l'id réel du viewer (pas status global ni __viewer__).
  if ((e.karmaJoinPaidProfilIds ?? []).includes(viewerId)) return true;
  if ((e.validatedPresentProfilIds ?? []).includes(viewerId)) return true;
  if ((e.waitlistEntries ?? []).some((w) => w.profilId === viewerId)) return true;
  if ((e.invitedProfilIds ?? []).includes(viewerId)) return true;

  return false;
}

/** Chat sortie : `userId` = organisateur ou inscrit. */
export function viewerHasEventChatAccess(
  e: Event,
  userId?: string | null,
): boolean {
  const id = userId?.trim();
  if (!id) return false;
  return (
    eventOrganizerUserId(e) === id ||
    (e.registeredParticipantIds ?? []).includes(id)
  );
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
  const user = useAuthStore.getState().user;
  const viewer: ViewerContext | null = user
    ? { id: user.id, displayName: user.displayName }
    : null;
  return viewerParticipatesInEvent(e, viewer);
}
