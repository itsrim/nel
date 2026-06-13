import type { Event, Friend } from "../data/mockData";
import { resolveAvatarUrl } from "./avatarUrl";

export type ViewerContext = { id: string; displayName?: string };

export function eventHostedByViewer(
  event: Event,
  viewer?: ViewerContext | null,
): boolean {
  if (event.hostedByViewer === true) return true;
  if (event.hostName === "Moi") return true;
  if (event.hostAvatar?.includes("nel-organizer")) return true;

  const viewerId = viewer?.id?.trim();
  const viewerName = viewer?.displayName?.trim();
  if (viewerId) {
    if (event.sheetOwnerUserId?.trim() === viewerId) return true;
    if (event.creatorId?.trim() === viewerId) return true;
  }
  if (viewerName) {
    if (event.creatorId?.trim() === viewerName) return true;
    if (event.hostName?.trim() === viewerName) return true;
  }
  return false;
}

/** Statut côté viewer — « organisateur » du Sheet ne s’applique qu’au créateur. */
export function effectiveViewerEventStatus(
  event: Event,
  viewer?: ViewerContext | null,
): Event["status"] {
  if (eventHostedByViewer(event, viewer)) {
    return "organisateur";
  }
  if (event.status === "organisateur") {
    return "inscrire";
  }
  return event.status;
}

/** Photo hôte à l’affichage — profil visiteur à jour si la sortie est la vôtre. */
export function resolveEventHostAvatar(
  event: Event,
  viewerProfileAvatarUrl: string,
  viewer?: ViewerContext | null,
): string {
  if (eventHostedByViewer(event, viewer)) {
    return resolveAvatarUrl(viewerProfileAvatarUrl);
  }
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
