import type { Event } from "../data/mockData";
import { geocodeLocationLabel, haversineKm } from "./geoCommunes";
import {
  DEFAULT_MAP_CITY,
  lookupCityLatLng,
} from "./proCoordinates";

export const EVENT_NEARBY_RADIUS_KM = 50;

export type LatLng = { lat: number; lng: number };

const coordsCache = new Map<string, LatLng | null>();

function cacheKey(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

/** Ville par défaut du filtre sorties : ville profil, sinon Toulouse. */
export function defaultEventsLocationFilter(profileCity?: string | null): string {
  const city = profileCity?.trim();
  return city || DEFAULT_MAP_CITY;
}

/** Résout un libellé de lieu → coordonnées (cache + ville / CP / BAN). */
export async function resolveLocationCoords(
  label: string,
): Promise<LatLng | null> {
  const raw = label.trim();
  if (!raw) {
    return lookupCityLatLng(DEFAULT_MAP_CITY);
  }
  const key = cacheKey(raw);
  if (coordsCache.has(key)) return coordsCache.get(key) ?? null;

  const known = lookupCityLatLng(raw);
  if (known) {
    coordsCache.set(key, known);
    return known;
  }

  try {
    const coords = await geocodeLocationLabel(raw);
    coordsCache.set(key, coords);
    return coords;
  } catch {
    coordsCache.set(key, null);
    return null;
  }
}

export type EventWithDistance = {
  event: Event;
  distanceKm: number;
};

/** Filtre ≤ radiusKm et trie du plus proche au plus loin. */
export function filterAndSortEventsByDistance(
  events: Event[],
  anchor: LatLng,
  coordsByEventId: Record<string, LatLng | null | undefined>,
  radiusKm = EVENT_NEARBY_RADIUS_KM,
): EventWithDistance[] {
  const out: EventWithDistance[] = [];
  for (const event of events) {
    const coords = coordsByEventId[event.id];
    if (!coords) continue;
    const distanceKm =
      Math.round(
        haversineKm(anchor.lat, anchor.lng, coords.lat, coords.lng) * 10,
      ) / 10;
    if (distanceKm > radiusKm) continue;
    out.push({ event, distanceKm });
  }
  out.sort((a, b) => a.distanceKm - b.distanceKm);
  return out;
}
