/* ========== API geo.api.gouv.fr ========== */

export type Commune = {
  nom: string;
  centre: { coordinates: [number, number] }; // [lon, lat]
  codesPostaux: string[];
  population: number;
  code: string;
};

export type CommuneAvecDistance = Commune & { distanceKm: number };

const BASE = "https://geo.api.gouv.fr/communes";

/**
 * Recherche des communes par autocomplétion (triées par population décroissante)
 */
export async function searchCommunes(
  query: string,
  limit = 7,
): Promise<Commune[]> {
  if (query.trim().length < 2) return [];
  const url = `${BASE}?nom=${encodeURIComponent(query.trim())}&fields=nom,centre,codesPostaux,population,code&boost=population&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geo.api.gouv.fr error: ${res.status}`);
  return res.json() as Promise<Commune[]>;
}

/** Communes pour un code postal (ex. 31700 → Blagnac). */
export async function searchCommunesByPostalCode(
  codePostal: string,
  limit = 5,
): Promise<Commune[]> {
  const cp = codePostal.trim();
  if (!/^\d{5}$/.test(cp)) return [];
  const url = `${BASE}?codePostal=${encodeURIComponent(cp)}&fields=nom,centre,codesPostaux,population,code&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geo.api.gouv.fr error: ${res.status}`);
  return res.json() as Promise<Commune[]>;
}

function communeToLatLng(commune: Commune): { lat: number; lng: number } | null {
  const coords = commune.centre?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lon, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lng: lon };
}

/** Meilleure commune pour un nom saisi (match exact / préfixe). */
export async function resolveCommuneByName(
  name: string,
): Promise<Commune | null> {
  const q = name.trim();
  if (q.length < 2) return null;
  const communes = await searchCommunes(q, 5);
  if (communes.length === 0) return null;
  const folded = foldGeoLabel(q);
  return (
    communes.find((c) => foldGeoLabel(c.nom) === folded) ??
    communes.find((c) => foldGeoLabel(c.nom).startsWith(folded)) ??
    communes.find((c) => folded.startsWith(foldGeoLabel(c.nom))) ??
    communes[0]
  );
}

/**
 * Géocode un libellé (ville, « Lieu, Ville, CP », adresse) → lat/lng.
 * Utilisé pour le filtre distance des sorties.
 */
export async function geocodeLocationLabel(
  label: string,
): Promise<{ lat: number; lng: number } | null> {
  const raw = label.trim().replace(/\s+/g, " ");
  if (!raw) return null;

  // 1) Nom de ville seul (« blagnac »)
  try {
    const byName = await resolveCommuneByName(raw);
    const coords = byName ? communeToLatLng(byName) : null;
    if (coords) return coords;
  } catch {
    /* continue */
  }

  // 2) Code postal dans le texte (« …, 31700 »)
  const cpMatch = raw.match(/\b(\d{5})\b/);
  if (cpMatch) {
    try {
      const byCp = await searchCommunesByPostalCode(cpMatch[1], 5);
      const coords = byCp[0] ? communeToLatLng(byCp[0]) : null;
      if (coords) return coords;
    } catch {
      /* continue */
    }
  }

  // 3) Segments « Salle des Fêtes, Blagnac, 31700 » → tester Blagnac, etc.
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (/^\d{5}$/.test(part)) continue;
    try {
      const commune = await resolveCommuneByName(part);
      const coords = commune ? communeToLatLng(commune) : null;
      if (coords) return coords;
    } catch {
      /* continue */
    }
  }

  // 4) BAN (adresses / lieux)
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(raw)}&limit=1`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as {
        features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
      };
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        const [lon, lat] = coords;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          return { lat, lng: lon };
        }
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

/** Libellé lieu standard : « Toulouse, 31000 ». */
export function formatCommuneLocation(commune: Commune): string {
  const nom = commune.nom.trim();
  const cp = commune.codesPostaux?.[0]?.trim();
  if (!nom) return cp || "";
  if (!cp) return nom;
  return `${nom}, ${cp}`;
}

function foldGeoLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function titleCasePlace(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => {
      if (!w) return w;
      if (/^(des|de|du|la|le|les|d'|l')$/i.test(w)) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/\bDes Fetes\b/gi, "des Fêtes")
    .replace(/\bFetes\b/gi, "Fêtes");
}

export type LocationSuggestion = {
  id: string;
  label: string;
  detail?: string;
};

type BanFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    id?: string;
    label?: string;
    name?: string;
    city?: string;
    postcode?: string;
    score?: number;
    type?: string;
  };
};

/** Recherche d’adresses / lieux via api-adresse.data.gouv.fr (BAN). */
export async function searchBanAddresses(
  query: string,
  limit = 6,
): Promise<LocationSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=${limit}&autocomplete=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`api-adresse error: ${res.status}`);
  const data = (await res.json()) as { features?: BanFeature[] };
  const out: LocationSuggestion[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    if (!p) continue;
    const name = (p.name ?? "").trim();
    const city = (p.city ?? "").trim();
    const cp = (p.postcode ?? "").trim();
    let label = "";
    if (name && city && cp) {
      label =
        foldGeoLabel(name) === foldGeoLabel(city)
          ? `${city}, ${cp}`
          : `${name}, ${city}, ${cp}`;
    } else {
      label = (p.label ?? "").trim();
    }
    if (!label) continue;
    out.push({
      id: `ban-${p.id ?? label}`,
      label,
      detail: p.type ? String(p.type) : undefined,
    });
  }
  return out;
}

/**
 * Suggestions lieu pour création d’événement.
 * Gère « salle des fetes Blagnac » → « Salle des fetes, Blagnac, 31700 »
 * (commune en fin de saisie + adresses BAN).
 */
export async function searchLocationSuggestions(
  query: string,
  limit = 7,
): Promise<LocationSuggestion[]> {
  const q = query.trim().replace(/\s+/g, " ");
  if (q.length < 2) return [];

  const out: LocationSuggestion[] = [];
  const seen = new Set<string>();
  const add = (s: LocationSuggestion) => {
    const key = foldGeoLabel(s.label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  const words = q.split(" ");
  let matched: Commune | null = null;
  let placePrefix = "";

  for (let n = Math.min(3, words.length); n >= 1; n--) {
    if (words.length > 1 && n === words.length) continue; // garder un préfixe lieu si possible
    const cityCandidate = words.slice(-n).join(" ");
    if (cityCandidate.length < 3) continue;
    try {
      const communes = await searchCommunes(cityCandidate, 5);
      const foldedCandidate = foldGeoLabel(cityCandidate);
      const hit =
        communes.find((c) => foldGeoLabel(c.nom) === foldedCandidate) ??
        communes.find((c) => {
          const fn = foldGeoLabel(c.nom);
          return (
            fn.startsWith(foldedCandidate) || foldedCandidate.startsWith(fn)
          );
        });
      if (!hit) continue;
      const fn = foldGeoLabel(hit.nom);
      // Évite les faux positifs trop lâches (« sa » → …)
      if (
        foldedCandidate.length < 4 &&
        fn !== foldedCandidate &&
        !fn.startsWith(foldedCandidate)
      ) {
        continue;
      }
      matched = hit;
      placePrefix = words.slice(0, -n).join(" ").trim();
      break;
    } catch {
      /* ignore */
    }
  }

  // Si tout le texte est une commune (« Blagnac »)
  if (!matched && words.length <= 3) {
    try {
      const communes = await searchCommunes(q, 5);
      const foldedQ = foldGeoLabel(q);
      matched =
        communes.find((c) => foldGeoLabel(c.nom) === foldedQ) ??
        communes.find((c) => foldGeoLabel(c.nom).startsWith(foldedQ)) ??
        null;
      placePrefix = "";
    } catch {
      /* ignore */
    }
  }

  if (matched) {
    const cityLabel = formatCommuneLocation(matched);
    if (placePrefix) {
      add({
        id: `place-${matched.code}`,
        label: `${titleCasePlace(placePrefix)}, ${cityLabel}`,
        detail: "Lieu + ville",
      });
    }
    add({
      id: `city-${matched.code}`,
      label: cityLabel,
      detail: "Commune",
    });
  }

  try {
    const ban = await searchBanAddresses(q, 8);
    const cityFold = matched ? foldGeoLabel(matched.nom) : "";
    const preferred = cityFold
      ? ban.filter((b) => foldGeoLabel(b.label).includes(cityFold))
      : [];
    const rest = ban.filter((b) => !preferred.includes(b));
    for (const s of [...preferred, ...rest]) add(s);
  } catch {
    /* ignore */
  }

  return out.slice(0, limit);
}

/**
 * Au blur : formate « lieu + ville » si une commune est détectée en fin de texte.
 */
export async function formatLocationOnCommit(
  location: string,
  profileCity?: string | null,
): Promise<string> {
  const raw = location.trim().replace(/\s+/g, " ");
  if (!raw) return "";
  try {
    const suggestions = await searchLocationSuggestions(raw, 4);
    const placeFirst = suggestions.find((s) => s.id.startsWith("place-"));
    if (placeFirst) return placeFirst.label;
    const exactCity = suggestions.find((s) => s.id.startsWith("city-"));
    if (exactCity && foldGeoLabel(exactCity.label).startsWith(foldGeoLabel(raw))) {
      return exactCity.label;
    }
  } catch {
    /* ignore */
  }
  return ensureLocationIncludesCity(raw, profileCity);
}

/**
 * Si le texte n’a pas encore de ville / CP, ajoute `, Ville` (ex. profil).
 * Ne touche pas un libellé déjà formaté (« …, 31000 » ou contenant la ville).
 */
export function ensureLocationIncludesCity(
  location: string,
  city?: string | null,
): string {
  const place = location.trim().replace(/\s+/g, " ");
  if (!place) return "";
  const cityLabel = city?.trim();
  if (!cityLabel) return place;
  if (/\b\d{5}\b/.test(place)) return place;
  const foldedPlace = foldGeoLabel(place);
  const foldedCity = foldGeoLabel(cityLabel);
  if (foldedPlace.includes(foldedCity)) return place;
  return `${place}, ${cityLabel}`;
}

/**
 * Calcule la distance Haversine entre deux points (en km)
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extrait le code département d'un code INSEE commune
 * (2 premiers chiffres, sauf Corse 2A/2B et DOM/COM)
 */
function codeDepartementFromCodeInsee(code: string): string {
  if (code.startsWith("97") || code.startsWith("98")) return code.slice(0, 3);
  if (code.startsWith("2A") || code.startsWith("2B")) return code.slice(0, 2);
  return code.slice(0, 2);
}

/**
 * Départements limitrophes connus pour éviter les trous à 50km
 */
const DEPARTEMENTS_LIMITROPHES: Record<string, string[]> = {
  "75": ["92", "93", "94", "77", "78", "91", "95"], // Paris
  "92": ["75", "93", "94", "78", "95"],
  "93": ["75", "92", "94", "77", "95"],
  "94": ["75", "92", "93", "77", "91"],
  "13": ["83", "84", "30", "34"], // Marseille
  "69": ["01", "38", "42", "71", "26", "07"], // Lyon
  "31": ["11", "34", "09", "65", "32", "82", "81"], // Toulouse
  "33": ["40", "47", "24", "17"], // Bordeaux
  "59": ["62", "80", "02"], // Lille
  "06": ["83", "04"], // Nice
};

/**
 * Récupère les communes du département et des départements limitrophes,
 * puis filtre celles dans un rayon donné autour d'un point, triées par distance.
 *
 * L'API geo.api.gouv.fr ne supportant pas de filtre rayon,
 * on charge les communes des départements concernés et on calcule Haversine côté client.
 */
export async function findNearbyCommunes(
  lat: number,
  lon: number,
  codeCommune: string,
  radiusKm = 50,
): Promise<CommuneAvecDistance[]> {
  const deptPrincipal = codeDepartementFromCodeInsee(codeCommune);
  const deptsAVoir = new Set<string>([deptPrincipal]);
  const limitrophes = DEPARTEMENTS_LIMITROPHES[deptPrincipal];
  if (limitrophes) {
    limitrophes.forEach((d) => deptsAVoir.add(d));
  }

  const toutesCommunes: Commune[] = [];

  for (const dept of deptsAVoir) {
    const url = `https://geo.api.gouv.fr/departements/${encodeURIComponent(dept)}/communes?fields=nom,centre,codesPostaux,population,code&limit=500`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const communes: Commune[] = await res.json();
        toutesCommunes.push(...communes);
      }
    } catch {
      // ignorer les erreurs d'un département
    }
  }

  return toutesCommunes
    .map((c) => {
      const [clon, clat] = c.centre.coordinates;
      const distanceKm = Math.round(haversineKm(lat, lon, clat, clon) * 10) / 10;
      return { ...c, distanceKm };
    })
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
