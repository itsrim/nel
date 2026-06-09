import {
  hasViewerPremiumAccess,
  hasViewerProAccess,
  type ViewerEntitlementState,
} from "./viewerEntitlements";

/** Plafond participantMax : doit être strictement supérieur à 4. */
export const EVENT_PARTICIPANT_MIN_MAX = 5;

export const EVENT_PARTICIPANT_CAP_NORMAL = 9;
export const EVENT_PARTICIPANT_CAP_PREMIUM = 20;
export const EVENT_PARTICIPANT_CAP_PRO = 50;
/** Admin : pas de plafond pratique (cap technique élevé). */
export const EVENT_PARTICIPANT_CAP_ADMIN = 150;

export function getEventParticipantMaxCap(state: ViewerEntitlementState): number {
  if (state.nelDemoIsAdmin) return EVENT_PARTICIPANT_CAP_ADMIN;
  if (hasViewerProAccess(state)) return EVENT_PARTICIPANT_CAP_PRO;
  if (hasViewerPremiumAccess(state)) return EVENT_PARTICIPANT_CAP_PREMIUM;
  return EVENT_PARTICIPANT_CAP_NORMAL;
}
