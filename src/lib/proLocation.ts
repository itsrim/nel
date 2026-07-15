import type { MockProfessional } from "../data/mockProfessionals";
import { resolveProCategoryFields, type ProCategory } from "./proCategory";

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
  proCategory?: ProCategory | string;
  bio?: string;
}): MockProfessional | null {
  if (input.lat == null || input.lng == null) return null;
  if (Number.isNaN(input.lat) || Number.isNaN(input.lng)) return null;

  const name = input.displayName.trim() || "Moi";
  const parts = name.split(/\s+/);
  const firstName = parts[0] ?? name;
  const lastName = parts.slice(1).join(" ");
  const { category, categoryLabel } = resolveProCategoryFields(input.proCategory);
  const bio = input.bio?.trim();

  return {
    id: VIEWER_PRO_ID,
    firstName,
    lastName,
    category,
    categoryLabel,
    city: input.city.trim() || "France",
    address: input.address.trim() || undefined,
    description: bio || categoryLabel,
    imageUrl: input.avatarUrl,
    mapX: 50,
    mapY: 50,
    lat: input.lat,
    lng: input.lng,
    verified: false,
    websiteUrl: input.websiteUrl.trim() || undefined,
    socialUrl: input.socialUrl.trim() || undefined,
    phone: input.phone.trim() || undefined,
  };
}
