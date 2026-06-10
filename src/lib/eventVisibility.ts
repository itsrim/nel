import type { Event } from "../data/mockData";

/**
 * Filtre « découverte » (accueil, agenda) : sortie privée masquée sauf
 * organisateur (vous), inscrits, ou administrateur nel (aperçu produit).
 */
export function eventIsVisibleInDiscovery(
  e: Event,
  isAdmin: boolean,
  moderationHiddenEventIds?: readonly string[],
  currentUserName?: string,
): boolean {
  if (moderationHiddenEventIds?.includes(e.id)) return false;
  if (e.isPrivate !== true) return true;
  if (isAdmin) return true;
  if (e.hostedByViewer === true) return true;
  // Check if current user is the creator
  if (currentUserName && e.creatorId === currentUserName) return true;
  if (
    e.status === "organisateur" &&
    (e.hostName === "Moi" || (e.hostAvatar?.includes("nel-organizer") ?? false))
  ) {
    return true;
  }
  if (e.status === "inscrit" || e.status === "en_attente") return true;
  return false;
}
