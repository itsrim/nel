import { isSubscriptionStillValid } from "./subscriptionDates";

export type ViewerEntitlementState = {
  nelDemoIsAdmin: boolean;
  nelDemoIsPremium: boolean;
  viewerPremiumExpiresAt: number | null;
  viewerProfileIsPro: boolean;
  viewerProExpiresAt: number | null;
};

/** Accès aux fonctionnalités Premium (mode admin inclus). */
export function hasViewerPremiumAccess(state: ViewerEntitlementState): boolean {
  if (state.nelDemoIsAdmin) return true;
  if (!state.nelDemoIsPremium) return false;
  if (state.viewerPremiumExpiresAt != null) {
    return isSubscriptionStillValid(state.viewerPremiumExpiresAt);
  }
  return true;
}

/** Accès aux fonctionnalités Pro (mode admin inclus). */
export function hasViewerProAccess(state: ViewerEntitlementState): boolean {
  if (state.nelDemoIsAdmin) return true;
  if (!state.viewerProfileIsPro) return false;
  if (state.viewerProExpiresAt != null) {
    return isSubscriptionStillValid(state.viewerProExpiresAt);
  }
  return true;
}
