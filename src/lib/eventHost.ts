import type { Event, Friend } from "../data/mockData";
import { VIEWER_KARMA_PARTICIPANT_ID } from "./karma";
import { resolveAvatarUrl } from "./avatarUrl";

export type ViewerContext = { id: string; displayName?: string };

/** userId Sheets de l'organisateur (ligne events). */
export function eventOrganizerUserId(event: Event): string | undefined {
  const owner = event.sheetOwnerUserId?.trim();
  if (owner) return owner;
  const creator = event.creatorId?.trim();
  if (creator && !creator.includes(" ")) return creator;
  return undefined;
}

export function eventHostedByViewer(
  event: Event,
  viewer?: ViewerContext | null,
): boolean {
  const viewerId = viewer?.id?.trim();
  const viewerName = viewer?.displayName?.trim();

  // Compte connecté : uniquement les ids (pas le displayName — collision = faux « organisateur »).
  if (viewerId) {
    const organizerId = eventOrganizerUserId(event);
    if (organizerId && organizerId === viewerId) return true;
    if (event.sheetOwnerUserId?.trim() === viewerId) return true;
    if (event.creatorId?.trim() === viewerId) return true;
    return false;
  }

  // Session locale sans userId : repli nom (démо / hors auth).
  if (viewerName) {
    if (event.creatorId?.trim() === viewerName) return true;
    if (event.hostName?.trim() === viewerName) return true;
  }
  return false;
}

export function viewerIsRegisteredParticipant(
  event: Event,
  viewer?: ViewerContext | null,
): boolean {
  const viewerId = viewer?.id?.trim();
  if (!viewerId) return false;
  return (event.registeredParticipantIds ?? []).includes(viewerId);
}

/** Statut côté viewer — ne pas réutiliser le flag global Sheets « organisateur » / « inscrit ». */
export function effectiveViewerEventStatus(
  event: Event,
  viewer?: ViewerContext | null,
  _options?: { conversationMembers?: Array<{ isSelf?: boolean }> },
): Event["status"] {
  if (eventHostedByViewer(event, viewer)) {
    return "organisateur";
  }
  if (viewerIsRegisteredParticipant(event, viewer)) {
    return "inscrit";
  }
  // Ne pas déduire l’inscription du roster chat (isSelf) : un GET / sync
  // pouvait y ajouter le viewer par erreur sans registeredParticipantIds.
  const viewerId = viewer?.id?.trim();
  if (
    viewerId &&
    (event.waitlistEntries ?? []).some((w) => w.profilId === viewerId)
  ) {
    return "en_attente";
  }
  if (
    !viewerId &&
    (event.waitlistEntries ?? []).some(
      (w) => w.profilId === VIEWER_KARMA_PARTICIPANT_ID,
    )
  ) {
    return "en_attente";
  }
  if (event.status === "organisateur") {
    return "inscrire";
  }
  if (event.status === "inscrit" || event.status === "en_attente") {
    return "inscrire";
  }
  return event.status;
}

/** Photo organisateur — toujours `hostAvatar` Sheets (identique pour tous les comptes). */
export function resolveEventHostAvatar(
  event: Event,
  _viewerProfileAvatarUrl?: string,
  _viewer?: ViewerContext | null,
): string {
  const stored = event.hostAvatar?.trim();
  return stored ? resolveAvatarUrl(stored) : resolveAvatarUrl();
}

export function resolveEventHostIsPro(
  event: Event,
  friends: Friend[],
  viewerProfileIsPro: boolean,
  viewer?: ViewerContext | null,
): boolean {
  if (eventHostedByViewer(event, viewer)) {
    return viewerProfileIsPro;
  }

  const hostName = event.hostName?.trim();
  const creatorId = event.creatorId?.trim();

  return friends.some(
    (f) =>
      f.isPro === true &&
      (f.name === hostName ||
        f.pseudo === hostName ||
        f.profilId === creatorId ||
        `u-${f.profilId}` === creatorId),
  );
}
