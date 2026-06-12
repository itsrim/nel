import type { Event, Friend } from "../data/mockData";
import { resolveAvatarUrl } from "./avatarUrl";

export function eventHostedByViewer(event: Event): boolean {
  return (
    event.hostedByViewer === true ||
    event.hostName === "Moi" ||
    (event.hostAvatar?.includes("nel-organizer") ?? false)
  );
}

/** Photo hôte à l’affichage — profil visiteur à jour si la sortie est la vôtre. */
export function resolveEventHostAvatar(
  event: Event,
  viewerProfileAvatarUrl: string,
): string {
  if (eventHostedByViewer(event)) {
    return resolveAvatarUrl(viewerProfileAvatarUrl);
  }
  const stored = event.hostAvatar?.trim();
  return stored ? resolveAvatarUrl(stored) : resolveAvatarUrl();
}

export function resolveEventHostIsPro(
  event: Event,
  friends: Friend[],
  viewerProfileIsPro: boolean,
): boolean {
  if (eventHostedByViewer(event)) {
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
