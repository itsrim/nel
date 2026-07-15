import type { MockProfessional } from "../data/mockProfessionals";
import { syncProfessionalToSheets } from "./appSheetPersistence";
import { useMessagingStore } from "../store/useMessagingStore";
import { useProsStore } from "../store/useProsStore";

/** Met à jour le statut vérifié d’un pro (annuaire + profil membre si lié). */
export function adminSetProfessionalVerified(
  pro: MockProfessional,
  verified: boolean,
): void {
  const updated: MockProfessional = { ...pro, verified };
  useProsStore.getState().upsertProfessional(updated);
  syncProfessionalToSheets(updated);

  const friend = useMessagingStore
    .getState()
    .friends.find((f) => f.profilId === pro.id);
  if (friend && friend.verified !== verified) {
    useMessagingStore.getState().updateProfile(pro.id, { verified });
    return;
  }
  useMessagingStore
    .getState()
    .showToast(verified ? "Profil Pro vérifié." : "Vérification Pro retirée.");
}

/** Synchronise verified depuis l’édition admin d’un profil membre Pro. */
export function syncProfessionalVerifiedFromProfile(
  profilId: string,
  verified: boolean,
): void {
  const pro = useProsStore.getState().professionals.find((p) => p.id === profilId);
  if (!pro) return;
  if (pro.verified === verified) return;
  adminSetProfessionalVerified(pro, verified);
}
