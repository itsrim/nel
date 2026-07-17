import { isSubscriptionStillValid } from "./subscriptionDates";

export type ViewerEntitlementState = {
  isAdmin: boolean;
  nelDemoIsPremium: boolean;
  viewerPremiumExpiresAt: number | null;
  viewerProfileIsPro: boolean;
  viewerProExpiresAt: number | null;
};

/** Abonnement Pro actif (hors mode admin). */
export function isViewerProSubscriptionActive(
  state: ViewerEntitlementState,
): boolean {
  if (!state.viewerProfileIsPro) return false;
  if (state.viewerProExpiresAt != null) {
    return isSubscriptionStillValid(state.viewerProExpiresAt);
  }
  return true;
}

/** Abonnement Premium actif (hors Pro / admin). */
export function isViewerPremiumSubscriptionActive(
  state: ViewerEntitlementState,
): boolean {
  if (!state.nelDemoIsPremium) return false;
  if (state.viewerPremiumExpiresAt != null) {
    return isSubscriptionStillValid(state.viewerPremiumExpiresAt);
  }
  return true;
}

/** Accès aux fonctionnalités Premium (mode admin et abonnement Pro inclus). */
export function hasViewerPremiumAccess(state: ViewerEntitlementState): boolean {
  if (state.isAdmin) return true;
  if (hasViewerProAccess(state)) return true;
  return isViewerPremiumSubscriptionActive(state);
}

/** Accès aux fonctionnalités Pro (mode admin inclus). */
export function hasViewerProAccess(state: ViewerEntitlementState): boolean {
  if (state.isAdmin) return true;
  return isViewerProSubscriptionActive(state);
}
