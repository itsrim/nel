/** Normalise une adresse saisie (espaces, virgules). */
export function normalizeProAddressInput(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ");
}

/** Vérifie qu'une adresse est suffisamment complète pour géocoder. */
export function isPlausibleProAddress(raw: string): boolean {
  const s = normalizeProAddressInput(raw);
  if (s.length < 8) return false;
  if (/\b\d{5}\b/.test(s)) return true;
  if (s.includes(",")) return true;
  // « 1 Place du Capitole » ou « 15 rue de la Paix »
  if (s.split(/\s+/).length >= 3) return true;
  return false;
}

export interface GeocodedAddress {
  displayAddress: string;
  lat: number;
  lng: number;
}

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

/** Géocode une adresse française via OpenStreetMap Nominatim. */
export async function geocodeProAddress(
  rawAddress: string,
  cityHint?: string,
): Promise<GeocodedAddress | null> {
  const address = normalizeProAddressInput(rawAddress);
  if (!isPlausibleProAddress(address)) return null;

  const city = cityHint?.trim();
  const query = city && !address.toLowerCase().includes(city.toLowerCase())
    ? `${address}, ${city}, France`
    : `${address}, France`;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "fr");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as NominatimResult[];
  const hit = data[0];
  if (!hit) return null;

  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return {
    displayAddress: hit.display_name.split(",").slice(0, 4).join(",").trim(),
    lat,
    lng,
  };
}
