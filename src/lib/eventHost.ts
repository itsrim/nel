import type { Event, Friend } from "../data/mockData";

export function eventHostedByViewer(event: Event): boolean {
  return (
    event.hostedByViewer === true ||
    event.hostName === "Moi" ||
    (event.hostAvatar?.includes("nel-organizer") ?? false)
  );
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
