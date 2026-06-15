import type { MockProfessional } from "../data/mockProfessionals";
import { resolveProCategoryFields } from "./proCategory";
import { isAdminAccount, shouldExcludeFromPublicCatalog } from "./accountRoles";
import { resolveAvatarUrl } from "./avatarUrl";
import { proCoordinates } from "./proCoordinates";
import { boolFromSheet, isDeletedFromSheet, numFromSheet } from "./sheetRowCodec";
import { isSubscriptionStillValid } from "./subscriptionDates";
import type { User } from "../store/useAuthStore";
import { hasViewerProAccess } from "./viewerEntitlements";
import type { ViewerEntitlementState } from "./viewerEntitlements";

/** Exclut les comptes staff / admin de l’annuaire public des professionnels. */
export function filterPublicProfessionals(
  professionals: readonly MockProfessional[],
): MockProfessional[] {
  return professionals.filter((p) => !isAdminAccount({ id: p.id }));
}

/** Le profil connecté apparaît dans l’annuaire seulement s’il est Pro (pas staff admin). */
export function shouldShowViewerInProsDirectory(
  user: User | null | undefined,
  entitlements: ViewerEntitlementState,
): boolean {
  if (isAdminAccount(user)) return false;
  return hasViewerProAccess(entitlements);
}

/** Compte inscrit avec abonnement Pro actif (viewer_settings). */
export function isActiveProMemberRow(
  row: Record<string, string>,
  skipEmailVerification: boolean,
): boolean {
  if (!boolFromSheet(row.isPro)) return false;
  const id = row.id?.trim() || row.userId?.trim();
  if (!id || isDeletedFromSheet(row.deleted)) return false;
  if (shouldExcludeFromPublicCatalog(id, row.email)) return false;
  const label = row.displayName?.trim() || row.email?.trim();
  if (!label) return false;
  if (
    !skipEmailVerification &&
    !boolFromSheet(row.emailVerified) &&
    !row.passwordHash?.trim()
  ) {
    return false;
  }
  const proExpiresRaw = row.proExpiresAt?.trim();
  if (proExpiresRaw) {
    const proExpiresAt = numFromSheet(proExpiresRaw, 0);
    if (proExpiresAt > 0 && !isSubscriptionStillValid(proExpiresAt)) return false;
  }
  return true;
}

/** Construit une fiche pro depuis une ligne viewer_settings (isPro=true). */
export function viewerSettingsRowToProfessional(
  row: Record<string, string>,
): MockProfessional | null {
  const id = row.id?.trim() || row.userId?.trim();
  if (!id) return null;

  const name = row.displayName?.trim() || row.email?.trim() || id;
  const parts = name.split(/\s+/);
  const firstName = parts[0] ?? name;
  const lastName = parts.slice(1).join(" ");
  const city = row.city?.trim() || "France";
  const { category, categoryLabel } = resolveProCategoryFields(row.proCategory);
  const bio = row.bio?.trim();

  const partial: Omit<MockProfessional, "lat" | "lng"> & {
    lat?: number;
    lng?: number;
  } = {
    id,
    firstName,
    lastName,
    category,
    categoryLabel,
    city,
    address: row.proAddress?.trim() || undefined,
    description: bio || categoryLabel,
    imageUrl: resolveAvatarUrl(row.avatarUrl),
    mapX: 50,
    mapY: 50,
    lat: row.proLat?.trim() ? numFromSheet(row.proLat) : undefined,
    lng: row.proLng?.trim() ? numFromSheet(row.proLng) : undefined,
    verified: boolFromSheet(row.emailVerified),
    websiteUrl: row.websiteUrl?.trim() || undefined,
    socialUrl: row.socialUrl?.trim() || undefined,
    phone: row.phone?.trim() || undefined,
  };

  const coords = proCoordinates(partial);
  return {
    ...partial,
    lat: partial.lat ?? coords.lat,
    lng: partial.lng ?? coords.lng,
  };
}

/**
 * Fusionne l’onglet `professionals` (métadonnées éditoriales) avec les comptes
 * isPro de viewer_settings (source de vérité des inscrits Pro).
 */
export function mergeProfessionalsCatalog(
  fromProfessionalsTable: MockProfessional[],
  fromProMembers: MockProfessional[],
): MockProfessional[] {
  const map = new Map<string, MockProfessional>();

  for (const pro of fromProMembers) {
    if (!isAdminAccount({ id: pro.id })) map.set(pro.id, pro);
  }

  for (const pro of fromProfessionalsTable) {
    if (isAdminAccount({ id: pro.id })) continue;
    const prev = map.get(pro.id);
    if (!prev) {
      map.set(pro.id, pro);
      continue;
    }
    const genericLabel = pro.categoryLabel.trim().toLowerCase() === "professionnel";
    const genericDesc =
      pro.description.trim() === "Professionnel référencé sur Hlg.";
    map.set(pro.id, {
      ...prev,
      ...pro,
      category: genericLabel ? prev.category : pro.category,
      categoryLabel: genericLabel ? prev.categoryLabel : pro.categoryLabel,
      description:
        genericDesc && prev.description.trim() ? prev.description : pro.description,
      verified: pro.verified === true ? true : prev.verified,
    });
  }

  return filterPublicProfessionals([...map.values()]);
}
