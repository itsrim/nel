import type { MockProfessional } from "../data/mockProfessionals";

export const VIEWER_PRO_ID = "pro_viewer";

export function formatProLocation(p: {
  address?: string;
  city: string;
}): string {
  const address = p.address?.trim();
  if (address) return address;
  return p.city.trim();
}

export function buildViewerProfessional(input: {
  displayName: string;
  avatarUrl: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  websiteUrl: string;
  socialUrl: string;
  phone: string;
}): MockProfessional | null {
  if (input.lat == null || input.lng == null) return null;
  if (Number.isNaN(input.lat) || Number.isNaN(input.lng)) return null;

  const name = input.displayName.trim() || "Moi";
  const parts = name.split(/\s+/);
  const firstName = parts[0] ?? name;
  const lastName = parts.slice(1).join(" ");

  return {
    id: VIEWER_PRO_ID,
    firstName,
    lastName,
    category: "therapeute",
    categoryLabel: "Professionnel",
    city: input.city.trim() || "France",
    address: input.address.trim() || undefined,
    description: "Professionnel référencé sur Hlg.",
    imageUrl: input.avatarUrl,
    mapX: 50,
    mapY: 50,
    lat: input.lat,
    lng: input.lng,
    verified: true,
    websiteUrl: input.websiteUrl.trim() || undefined,
    socialUrl: input.socialUrl.trim() || undefined,
    phone: input.phone.trim() || undefined,
  };
}
