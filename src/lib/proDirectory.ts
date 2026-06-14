import type { MockProfessional } from "../data/mockProfessionals";
import { isAdminAccount } from "./accountRoles";
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
