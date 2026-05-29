/** Coordonnées approximatives par ville (centre). */
const CITY_LATLNG: Record<string, [number, number]> = {
  Paris: [48.8566, 2.3522],
  Lyon: [45.764, 4.8357],
  Bordeaux: [44.8378, -0.5792],
  Montpellier: [43.6108, 3.8767],
  Nantes: [47.2184, -1.5536],
  Toulouse: [43.6047, 1.4442],
  Marseille: [43.2965, 5.3698],
  Lille: [50.6292, 3.0573],
  Strasbourg: [48.5734, 7.7521],
  Nice: [43.7102, 7.262],
  Rennes: [48.1173, -1.6778],
  Grenoble: [45.1885, 5.7245],
  Annecy: [45.8992, 6.1294],
};

const FRANCE_CENTER: [number, number] = [46.603354, 1.888334];

export const DEFAULT_MAP_CITY = "Toulouse";
export const DEFAULT_MAP_ZOOM = 11;

/** Centre carte : ville du profil si reconnue, sinon Toulouse. */
export function mapCenterForCity(cityLabel?: string | null): [number, number] {
  const label = cityLabel?.trim();
  if (label) {
    const cityKey = Object.keys(CITY_LATLNG).find((k) =>
      label.toLowerCase().includes(k.toLowerCase()),
    );
    if (cityKey) return CITY_LATLNG[cityKey];
  }
  return CITY_LATLNG[DEFAULT_MAP_CITY];
}

export function proCoordinates(p: {
  city: string;
  mapX: number;
  mapY: number;
  lat?: number;
  lng?: number;
}): { lat: number; lng: number } {
  if (p.lat != null && p.lng != null && !Number.isNaN(p.lat) && !Number.isNaN(p.lng)) {
    return { lat: p.lat, lng: p.lng };
  }
  const cityKey =
    Object.keys(CITY_LATLNG).find((k) =>
      p.city.toLowerCase().includes(k.toLowerCase()),
    ) ?? null;
  const [baseLat, baseLng] = cityKey ? CITY_LATLNG[cityKey] : FRANCE_CENTER;
  return {
    lat: baseLat + (p.mapY - 50) * 0.004,
    lng: baseLng + (p.mapX - 50) * 0.004,
  };
}
